import {
  Application, Request,
} from 'express';
import passport from 'passport';
import { Strategy } from 'passport-google-oauth20';

import dayjs from 'dayjs';

import config from '../../config';
import endpoint from '../core/utilities/endpoint';
import safePromise from '../../utilities/safe-promise';
import { modules } from '../core/common';
import random from '../core/common/generate';
import {
  usersActivatedProvider,
  tokenService,
} from '../core/services/user';
import { prisma } from '../core/db/prisma';
import { userSnakeCaseToCamelCase, userCamelCaseToSnakeCase, providersCredentialAndTokenSnakeCaseToCamelCase } from '../core/db/prisma/converters';
import { loggerService } from '../../utilities';
import { notify } from '../../utilities/notify';

const {
  USER_ALLOWED_COUNT = 9999999999999,
  USER_API_TOKEN_ENABLED,
  SEED_USER_API_KEY_SUFFIX = 'trial',
  SEED_USER_API_TOKEN_LIMIT = 0,
} = process.env;

const {
  generate: generateUserId, getFullName, jwt,
} = modules;

const notifyEvent = async (isNew: boolean, provider: string, user: any, req: any) => {
  let text = '';

  if (isNew) {
    text = `
    New Registration From ${provider}
    
    👤 Email : ${user.email},
    👤 Name : ${getFullName(user)},
    ⏳ Country : 
    🌐 IP: ${req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'local'}
  `;
  } else {
    text = `
      New Login or Registration Attempt from Google
      
      Date: ${dayjs().format('YYYY-MM-DD HH:mm A')}
      🌐 IP: ${req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'local'}
    `;
  }

  await notify(text);
};

const { generateApiToken } = random;

const { AUTH_MOUNT_POINT } = config;

const isNewUserAllowed = async () => {
  const [error, count] = await safePromise(prisma.users.count());

  if (error) throw error;
  return !(count >= +USER_ALLOWED_COUNT);
};

export default (app: Application): void => {
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
    // where is this user.id going? Are we supposed to access this anywhere?
  });

  // used to deserialize the user
  passport.deserializeUser((id: any, done) => {
    done(null, id);
  });

  const cb = (provider: string) => async (
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: { [key: string]: any },
    cb: any,
  ) => {
    const email = profile.emails[0].value;
    let userData = null;
    // Build Prisma where clause directly
    let prismaWhere: any = {};
    if (req.session && req.session.user) {
      const { ref_id } = req.session.user;
      prismaWhere = {
        OR: [
          { ref_id },
          { email },
        ],
      };
    } else {
      prismaWhere = {
        email,
      };
    }

    const [error, userDataObj] = await safePromise(
      prisma.users.findFirst({ where: prismaWhere })
    );

    if (error) {
      return cb(error);
    }
    userData = userDataObj ? userCamelCaseToSnakeCase(userDataObj) : null;
    if (!userData) {
      const [nerror, newUserAllowed] = await safePromise(isNewUserAllowed());
      if (nerror) {
        loggerService.error(nerror);
        return cb(nerror);
      }

      if (!newUserAllowed) {
        const message = 'User limit has reached, new user is not allowed.';
        const error : { [key:string]: any } = new Error(message);
        error.code = 422;
        return cb(nerror);
      }
      const user: any = {};
      const ref_id = generateUserId();
      user.email = email;
      user.first_name = profile.name && profile.name.givenName ? profile.name.givenName.trim() : '';
      user.last_name = profile.name && profile.name.familyName ? profile.name.familyName.trim() : '';
      user.password_hash = null;
      user.email_verified = true;
      user.ref_id = ref_id;
      user.username = ref_id;
      user.extra = {
        suffix: SEED_USER_API_KEY_SUFFIX,
        api_token_limit: SEED_USER_API_TOKEN_LIMIT,
      };
      const prismaData = userSnakeCaseToCamelCase(user);
      const [error, userNew] = await safePromise(
        prisma.users.create({ data: prismaData })
      );
      if (error) {
        loggerService.error(error);
        return cb(error);
      }
      userData = userCamelCaseToSnakeCase(userNew);
      userData.new = true;

      if (USER_API_TOKEN_ENABLED) {
        const user_api_token = generateApiToken('r', 'at');
        const payload = {
          user_ref_id: userData.ref_id,
          api_token: user_api_token,
          active: true,
        };
        const [tokenError] = await safePromise(tokenService.add(payload));

        if (tokenError) {
          loggerService.error('GoogleOAuth: api_token Create Error', tokenError);
        }
      }
    } else {
      // userData is already converted from Prisma

      // session exists found but the not same email
      if (userData.email !== email) {
        delete req.session.user;
      }
      userData.new = false;
    }

    const tokenLogs: any = {
      user_id: userData.id,
      user_ref_id: userData.ref_id,
      provider: provider.toUpperCase(),
      auth_type: 'OAUTH2.0',
      event: 'login',
      remark: userData.new ? 'new account' : 'login',
    };
    let updateStatus = null;
    if (!userData.new) {
      // Find existing credential first
      const [findError, existingCred] = await safePromise(
        prisma.providers_credential_and_tokens.findFirst({
          where: {
            user_ref_id: userData.ref_id,
            provider,
          },
        }),
      );

      if (findError) {
        loggerService.error('Error finding provider token ', { error: findError });
        return cb(findError);
      }

      if (existingCred) {
        // TODO: Encrypt this payload
        const update = {
          config: {
            name: getFullName(userData),
            email: userData.email,
          },
          // eslint-disable-next-line no-underscore-dangle
          provider_data: profile._json,
        };
        const prismaUpdate = providersCredentialAndTokenSnakeCaseToCamelCase(update);
        const [error] = await safePromise(
          prisma.providers_credential_and_tokens.update({
            where: { id: existingCred.id },
            data: prismaUpdate,
          }),
        );
        if (error) {
          loggerService.error('Error updating provider token ', { error });
          return cb(error);
        }
        updateStatus = true;
        tokenLogs.remark = `${tokenLogs.remark} & token updated.`;
      }
    }

    if (!updateStatus) {
      // TODO: Encrypt this payload
      const payload: any = {
        user_ref_id: userData.ref_id,
        provider,
        auth_type: 'OAUTH2.0',
        config: {
          name: getFullName(userData),
          email: userData.email,
        },
        // eslint-disable-next-line no-underscore-dangle
        provider_data: profile._json,
      };

      const prismaPayload = providersCredentialAndTokenSnakeCaseToCamelCase(payload);
      const [tokenError] = await safePromise(
        prisma.providers_credential_and_tokens.create({
          data: prismaPayload,
        }),
      );

      if (tokenError) {
        return cb(tokenError);
      }
      tokenLogs.remark = `${tokenLogs.remark} & token added`;
    }

    const [activationError] = await safePromise(usersActivatedProvider({
      user: userData,
      provider: provider.toLowerCase(),
    }));

    if (activationError) {
      return cb(activationError);
    }

    if (req.session) {
      req.session.user = {
        id: userData.id,
        ref_id: userData.ref_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
      };
    }

    cb(null, userData);

    if (userData.new) {
      await notifyEvent(userData.new, provider, userData, req);
    }
  };

  const { SCOPE: MERGED_SCOPE, CLIENT_ID, CLIENT_SECRET }: any = config.OAUTH.GOOGLE;
  const GOOGLE_AUTH_PATH = `${AUTH_MOUNT_POINT}/google`;
  const GOOGLE_AUTH_CALLBACK_PATH = `${GOOGLE_AUTH_PATH}/callback`;
  const GOOGLE_AUTH_CALLBACK_URL = `${config.PROTOCOL}://${config.APP_DOMAIN}${GOOGLE_AUTH_CALLBACK_PATH}`;

  const dispatchLogin = passport.authenticate('google', {
    scope: MERGED_SCOPE,
    accessType: 'offline',
    prompt: 'consent',
  });

  app.get(`${GOOGLE_AUTH_PATH}`, async (req, res, next) => {
    passport.use(new Strategy({
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: GOOGLE_AUTH_CALLBACK_URL,
      passReqToCallback: true,
    }, cb('google')));

    await notifyEvent(false, 'google', {}, req);
    return next();
  }, dispatchLogin);

  const failureRedirect = endpoint.providerFailureRedirectUrl('google', '');
  app.get(`${GOOGLE_AUTH_CALLBACK_PATH}`, passport.authenticate('google', { failureRedirect }), (req, res) => {
    const { token } = jwt.generateJwtToken(req.session.user);
    const redirect = endpoint.redirectToUIPage(token);
    return res.redirect(redirect);
  });
};
