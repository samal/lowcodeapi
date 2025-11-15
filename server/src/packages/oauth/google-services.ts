import { Application, Request } from 'express';
import passport from 'passport';
import { Strategy } from 'passport-google-oauth20';

import config from '../../config';
import endpoint from '../core/utilities/endpoint';
import safePromise from '../../utilities/safe-promise';
import {
  fetchProvidersCustomOauthCredentials,
} from '../core/services/providers';
import {
  usersActivatedProvider,
} from '../core/services/user';

import db from '../core/db';
import middlewares from '../core/middlewares';
import { cryptograper, loggerService } from '../../utilities';

const { User, ProvidersCredentialAndToken } = db.models;

const GOOGLE_SERVICE = [
  'GOOGLESHEETS',
  'GOOGLEDOCS',
  'GOOGLEDRIVE',
  'GOOGLECALENDAR',
  'GMAIL',
  'GOOGLEFORMS',
];

const REDIRECT_TARGET: any = {
  GMAIL: { target: 'gmail' },
  GOOGLESHEETS: { target: 'googlesheets' },
  GOOGLEDRIVE: { target: 'googledrive' },
  GOOGLEDOCS: { target: 'googledocs' },
  GOOGLECALENDAR: { target: 'googlecalendar' },
  GOOGLEFORMS: { target: 'googleforms' },
};
const { AUTH_MOUNT_POINT } = config;

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
    let where = {};
    if (req.session && req.session.user) {
      where = {
        where: {
          ref_id: req.session.user.ref_id,
        },
      };
    } else {
      where = {
        where: {
          email,
        },
      };
    }
    const [error, userDataObj] = await safePromise(User.findOne(where));

    if (error) {
      return cb(error);
    }

    userData = userDataObj;

    if (!userData) {
      return cb('No user found for this OAuth authorization');
    }
    userData = userData.toJSON();
    userData.new = false;

    const tokenLogs: any = {
      user_ref_id: userData.ref_id,
      provider: provider.toUpperCase(),
      auth_type: 'OAUTH2.0',
      event: 'access',
      remark: 'OAuth authorization request.',
    };
    let updateStatus = null;
    if (!userData.new) {
      const update = {
        config: {
          encrypted: cryptograper.encrypt(
            {
              refreshToken,
              accessToken,
            },
          ),
        },
        // eslint-disable-next-line no-underscore-dangle
        provider_data: profile._json,
      };
      const [error, data] = await safePromise(
        ProvidersCredentialAndToken.update(update, {
          where: {
            user_ref_id: userData.ref_id,
            provider: provider.toLowerCase(),
          },
        }),
      );
      if (error) {
        loggerService.error('Error updating provider token ', { error });
        return cb(error);
      }
      updateStatus = data ? data[0] : null;
      if (updateStatus) {
        tokenLogs.remark = `${tokenLogs.remark} & token updated.`;
      }
    }

    if (!updateStatus) {
      loggerService.info('creating user', userDataObj);
      const payload: any = {
        user_ref_id: userData.ref_id,
        provider: provider.toLowerCase(),
        auth_type: 'OAUTH2.0',
        config: {
          encrypted: cryptograper.encrypt(
            {
              refreshToken,
              accessToken,
            },
          ),
        },
        // eslint-disable-next-line no-underscore-dangle
        provider_data: profile._json,
      };

      const [tokenError] = await safePromise(
        ProvidersCredentialAndToken.create(payload),
      );

      if (tokenError) {
        return cb(tokenError);
      }
      tokenLogs.remark = `${tokenLogs.remark} & token added`;
    }

    const [activationError] = await safePromise(
      usersActivatedProvider({
        user: userData,
        provider: provider.toLowerCase(),
      }),
    );

    if (activationError) {
      return cb(activationError);
    }

    cb(null, userData);
  };

  GOOGLE_SERVICE.forEach((provider) => {
    // if (!config.OAUTH[provider]) return;
    let { SCOPE: MERGED_SCOPE } : { SCOPE: string[] } = config.OAUTH && config.OAUTH[provider] ? config.OAUTH[provider] :  config.OAUTH.GOOGLE;
    let CLIENT_ID : string;
    let CLIENT_SECRET : string;

    const GOOGLE_AUTH_PATH = `${AUTH_MOUNT_POINT}/${provider.toLowerCase()}`;
    const GOOGLE_AUTH_CALLBACK_PATH = `${GOOGLE_AUTH_PATH}/callback`;
    const GOOGLE_AUTH_CALLBACK_URL = `${config.PROTOCOL}://${config.APP_DOMAIN}${GOOGLE_AUTH_CALLBACK_PATH}`;

    const dispatchLogin = passport.authenticate('google', {
      // scope: MERGED_SCOPE,
      accessType: 'offline',
      prompt: 'consent',
    });

    app.get(
      `${GOOGLE_AUTH_PATH}`,
      middlewares.isAuthorized,
      async (req, res, next) => {
        if (req.session && req.session.user) {
          loggerService.info(req.session, provider, 'login intent');
          const { user } = req.session;
          const [error, auth] = await safePromise(
            fetchProvidersCustomOauthCredentials({
              user_ref_id: user.ref_id,
              provider: provider.toLowerCase(),
            }),
          );

          if (error) {
            loggerService.error('users auth creds not fetched', error);
          } else if (
            auth[provider.toLowerCase()]
            && auth[provider.toLowerCase()].creds
          ) {
            const { creds } = auth[provider.toLowerCase()];
            let CI; let
              CS;
            if (creds.encrypted) {
              try {
                const decrypted = JSON.parse(cryptograper.decrypt(creds.encrypted.value));
                CI = decrypted.CLIENT_ID;
                CS = decrypted.CLIENT_SECRET;
              } catch (error) {
                loggerService.error('Provider: Error decrypting the creds', provider, error);
                return res.json({ message: 'There was an error processing the request.' });
              }
            } else if (creds.CLIENT_ID && creds.CLIENT_SECRET) {
              CI = creds.CLIENT_ID;
              CS = creds.CLIENT_SECRET;
            }

            if (CI && CS) {
              if (creds.selected_scopes) {
                MERGED_SCOPE = [...MERGED_SCOPE, ...creds.selected_scopes];
              }
              CLIENT_ID = CI;
              CLIENT_SECRET = CS;
              loggerService.info('Using user specific auth credentials with', MERGED_SCOPE);
            }
          } else {
            loggerService.info(
              'No user specific auth credentials, will be using global creds.',
            );
          }
        }

        if (!CLIENT_ID || !CLIENT_SECRET) {
          loggerService.info('CLIENT_ID or CLIENT_SECRET is not configured in env or user\'s account.');
          return res.redirect(endpoint.providerFailureRedirectUrl(provider.toLowerCase(), 'No OAuth2.0 credential found.'));
        }

        passport.use(
          new Strategy(
            {
              clientID: CLIENT_ID,
              clientSecret: CLIENT_SECRET,
              callbackURL: GOOGLE_AUTH_CALLBACK_URL,
              scope: MERGED_SCOPE,
              passReqToCallback: true,
            },
            cb(provider),
          ),
        );
        return next();
      },
      dispatchLogin,
    );

    app.get(
      `${GOOGLE_AUTH_CALLBACK_PATH}`,
      passport.authenticate('google', {
        failureRedirect: endpoint.providerFailureRedirectUrl(provider, ''),
      }),
      (req, res) => {
        let target = 'providers';
        let redirect = endpoint.providerSuccessRedirectUrl('providers');

        if (REDIRECT_TARGET[provider]) {
          target = REDIRECT_TARGET[provider].target.toLowerCase();
          redirect = endpoint.providerSuccessRedirectUrl(target);
        }
        res.redirect(redirect);
      },
    );
  });
};
