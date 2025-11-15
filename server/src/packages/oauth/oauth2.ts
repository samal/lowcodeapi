import {
  Application, NextFunction, Request, Response,
} from 'express';
import jwt from 'jsonwebtoken';
import uri from 'url';
import passport from 'passport';
import {
  Strategy as OAuth2Strategy,
  InternalOAuthError,
} from 'passport-oauth2';
import config from '../../config';
import { safePromise, cryptograper, loggerService } from '../../utilities';

import endpoint from '../core/utilities/endpoint';

import {
  fetchProvidersCustomOauthCredentials,
} from '../core/services/providers';
import {
  usersActivatedProvider,
} from '../core/services/user';

import db from '../core/db';
import { prisma } from '../core/db/prisma';
import { userCamelCaseToSnakeCase } from '../core/db/prisma/converters';

import providersJsonFile from './providers.json';

const providerJson: { [key: string]: any } = { ...providersJsonFile };

const { ProvidersCredentialAndToken } = db.models;

const { AUTH_MOUNT_POINT } = config;

export default async (app: Application) => {
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id: any, done) => {
    done(null, id);
  });

  const providerKeys: string[] = Object.keys(providerJson);

  const cb = (provider: string) => async (
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: { [key: string]: any },
    cb: any,
  ) => {
    loggerService.info(profile);
    if (req.session) {
      loggerService.info('Session Found', req.session);
      const [error, userDataObj] = await safePromise(
        prisma.users.findFirst({
          where: {
            id: req.session.user!.id,
          },
        }),
      );

      if (error) {
        return cb(error);
      }
      let userData = userDataObj ? userCamelCaseToSnakeCase(userDataObj) : null;
      if (userData) {
        userData.new = false;
      }

      let updateStatus = null;
      if (!userData.new) {
        const update = {
          config: {
            encrypted: cryptograper.encrypt(
              {
                refreshToken,
                accessToken,
                token: accessToken,
              },
            ),
          },
          provider_data: profile ? profile._json : {}, // eslint-disable-line no-underscore-dangle
        };
        const [error, data] = await safePromise(
          ProvidersCredentialAndToken.update(update, {
            where: {
              user_ref_id: userData.ref_id,
              provider,
            },
          }),
        );
        if (error) {
          loggerService.error('Error updating provider token ', { error });
          return cb(error);
        }
        updateStatus = data ? data[0] : null;
      }

      if (!updateStatus) {
        const payload: any = {
          user_id: userData.id,
          user_ref_id: userData.ref_id,
          provider,
          auth_type: 'OAUTH2.0',
          config: {
            encrypted: cryptograper.encrypt(
              {
                refreshToken,
                accessToken,
                token: accessToken,
              },
            ),
          },
          provider_data: profile ? profile._json : {}, // eslint-disable-line no-underscore-dangle
        };

        const [tokenError] = await safePromise(
          ProvidersCredentialAndToken.create(payload),
        );

        if (tokenError) {
          return cb(tokenError);
        }
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
    }
    cb(null, profile);
  };

  providerKeys.forEach((provider) => {
    const pd = provider.toUpperCase();
    if (!providerJson[pd]) {
      loggerService.info(`Ignoring ${provider.toLowerCase()} OAuth, as configuration is not found.`);
      return;
    }

    let CLIENT_ID : string;
    let CLIENT_SECRET: string;

    const {
      AUTHENTICATION_URL, AUTHORIZATION_URL,
      USER_PROFILE_URL,
      SCOPE_TYPE,
      SCOPE_TYPE_CONVERT,
      EXTRA_OPTIONS = {},
      ID_MAPPING,
      PROFILE_POST_METHOD, TOKEN_IN_PATH = '',
      SCOPE = [],
    } = providerJson[pd];

    const ENDPOINT_OPTIONS : Array<string> = ['auth_endpoint', 'endpoint', 'subdomain'];

    const PROVIDER_AUTH_PATH = `${AUTH_MOUNT_POINT}/${provider.toLowerCase()}`;
    const PROVIDER_AUTH_CALLBACK_PATH = `${PROVIDER_AUTH_PATH}/callback`;
    const PROVIDER_AUTH_CALLBACK_URL = `${config.PROTOCOL}://${config.APP_DOMAIN}${PROVIDER_AUTH_CALLBACK_PATH}`;

    let authorizationURL = AUTHENTICATION_URL;
    let tokenURL = AUTHORIZATION_URL;
    let profileURL = USER_PROFILE_URL;
    const scope = (typeof SCOPE !== 'string' && SCOPE_TYPE === 'string') ? SCOPE.join(',') : SCOPE;
    const dispatchLogin = passport.authenticate('oauth2', {
      scope,
      // accessType: 'offline',
      prompt: 'consent',
    });

    // authenticate
    app.get(
      PROVIDER_AUTH_PATH,
      async (req: Request, res: Response, next: NextFunction) => {
        const providerLower = provider.toLowerCase();
        let local_scope = scope;
        OAuth2Strategy.prototype.userProfile = function userProfile(token, done) {
          let json: any;
          // eslint-disable-next-line no-underscore-dangle
          const profileResponse = (err: any, body: any, res: any) => {
            if (err) {
              if (err.data) {
                try {
                  json = JSON.parse(err.data);
                } catch (_) {
                // loggerService.error({ _ });
                }
              }

              if (json && json.errors && json.errors.length) {
                const e: any = json.errors[0];
                return done(new Error(e.message));
              }
              return done(
                new InternalOAuthError('Failed to fetch user profile', err),
              );
            }

            try {
              json = JSON.parse(body);
            } catch (ex) {
              return done(new Error('Failed to parse user profile'));
            }

            const profile = {
              ...json,
              provider: providerLower,
              _raw: body,
              _json: json,
              _accessLevel: res.headers['x-access-level'],
            };

            // This is required to standardized the serialization
            if (typeof ID_MAPPING === 'string' && json[ID_MAPPING]) {
              profile.id = json[ID_MAPPING];
            } else if (typeof ID_MAPPING === 'object' && json[ID_MAPPING.key] && json[ID_MAPPING.key][ID_MAPPING.value]) {
              profile.id = json[ID_MAPPING.key][ID_MAPPING.value];
            }
            done(null, profile);
          };

          // @ts-ignore
          if ((req.session.user
              && req.session.user[providerLower]
              && req.session.user[providerLower].profileURL)
              || USER_PROFILE_URL) {
            const userProfileURL = (req.session.user
              && req.session.user[providerLower]
              && req.session.user[providerLower].profileURL)
              || USER_PROFILE_URL;
            // @ts-ignore
            this._userProfileURL = userProfileURL; // eslint-disable-line no-underscore-dangle

            let url: any = uri.parse(userProfileURL);
            url.query = url.query || {};
            url = uri.format(url);

            if (TOKEN_IN_PATH) {
              url = url.replace('%7B%7Btoken%7D%7D', token);
            }
            if (PROFILE_POST_METHOD) {
              const body = null;
              // @ts-ignore
              this._oauth2._request('POST', url, { Authorization: this._oauth2.buildAuthHeader(token) }, body, token, profileResponse); // eslint-disable-line no-underscore-dangle
            } else {
            // @ts-ignore
              this._oauth2.useAuthorizationHeaderforGET( // eslint-disable-line no-underscore-dangle
                true,
              );
              // @ts-ignore
              this._oauth2.get( // eslint-disable-line no-underscore-dangle
                url,
                token,
                profileResponse,
              );
            }

            // clean up
            // @ts-ignore
            if ((req.session.user[providerLower])) {
            // @ts-ignore
              delete req.session.user[providerLower];
            }
          } else {
            try {
              const obj = jwt.decode(token) || { id: token };

              profileResponse(null, JSON.stringify(obj), { headers: {} });
            } catch (e) {
            // handler fallback here
            }
          }
        };
        if (req.session && req.session.user) {
          loggerService.info(req.session, providerLower);
          const { user } = req.session;
          const [error, auth] = await safePromise(
            fetchProvidersCustomOauthCredentials({
              user_ref_id: user.ref_id,
              provider: providerLower,
            }),
          );

          if (error) {
            loggerService.error('users auth creds not fetched', error);
          } else if (
            auth[providerLower]
          && auth[providerLower].creds
          ) {
            const { creds } = auth[providerLower];
            let CI; let
              CS;
            if (creds.encrypted && creds.encrypted.value) {
              try {
                const decrypted = JSON.parse(
                  cryptograper.decrypt(creds.encrypted.value),
                );
                CI = decrypted.CLIENT_ID;
                CS = decrypted.CLIENT_SECRET;
              } catch (error) {
                loggerService.error(
                  'Provider: Error decrypting the creds',
                  providerLower,
                  error,
                );
              }
            } else if (creds.CLIENT_ID && creds.CLIENT_SECRET) {
              CI = creds.CLIENT_ID;
              CS = creds.CLIENT_SECRET;
            }
            if (CI && CS) {
              if (creds.selected_scopes) {
                local_scope = [...scope, ...creds.selected_scopes];
                if (SCOPE_TYPE_CONVERT) {
                  local_scope = local_scope.join(',');
                }
              }
              CLIENT_ID = CI;
              CLIENT_SECRET = CS;
              loggerService.info('Using user specific auth credentials with', scope);
            }

            ENDPOINT_OPTIONS.forEach((variable) => {
              if (creds[variable]) {
                authorizationURL = authorizationURL.replace(`{${variable}}`, creds[variable]);
                tokenURL = tokenURL.replace(`{${variable}}`, creds[variable]);
                profileURL = profileURL.replace(`{${variable}}`, creds[variable]);
                // @ts-ignore
                req.session.user[providerLower] = { profileURL };
              }
            });
          } else {
            loggerService.info(
              'No user specific auth credentials, will be using global creds.',
            );
          }
        } else {
          delete req.session.user;
          return res.redirect(endpoint.getLoginUrl(`Invalid session or session expired. Login again to autorize ${providerLower}`));
        }

        if (!CLIENT_ID || !CLIENT_SECRET) {
          const message = `Configure your ${providerLower}'s OAuth credential in your account.`;
          loggerService.info(`\n\n${message}\n\n`);
          return res.redirect(endpoint.providerFailureRedirectUrl(providerLower, message));
        }
        passport.use(new OAuth2Strategy(
          {
            ...EXTRA_OPTIONS, // Provider specific options
            authorizationURL,
            tokenURL,
            clientID: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            callbackURL: PROVIDER_AUTH_CALLBACK_URL,
            passReqToCallback: true,
            scope: local_scope,
            // skipUserProfile: true, // USER_PROFILE_URL ? false : true,

          },
          cb(providerLower),
        ));

        next();
      },
      dispatchLogin,
    );

    // token
    app.get(
      PROVIDER_AUTH_CALLBACK_PATH,
      async (req: Request, res: Response, next: NextFunction) => {
        const provider: string = req.path.split('/')[2].toLowerCase();
        if (!providerKeys.includes(provider.toUpperCase())) {
          return res.send(404).json({ msg: 'Requested provider is not exist.' });
        }

        next();
      },
      passport.authenticate('oauth2', {
        failureRedirect: endpoint.providerFailureRedirectUrl(provider.toLowerCase(), ''),
      }),
      (req, res) => {
        loggerService.info('All good');
        const redirect = endpoint.providerSuccessRedirectUrl(provider.toLowerCase());
        res.redirect(redirect);
      },
    );
  });
};
