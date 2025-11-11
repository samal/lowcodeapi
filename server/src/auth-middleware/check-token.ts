import getProviderCredsUsingApiTokenFn from '../packages/core/services/providers/api-token-fn';

import {
  safePromise,
  loggerService,
  cacheService,
  cryptograper,
} from '../utilities';

const {
  ACCEPT_CLIENT_CREDENTIALS_USERS,
  CACHE_PROVIDER_CREDS_EXPIRY_TIME = 120,
} = process.env;

const verifyTokenAndGetCreds = getProviderCredsUsingApiTokenFn;

let CLIENT_CREDENTIALS_USERS: string[] = [];
try {
  CLIENT_CREDENTIALS_USERS = JSON.parse(ACCEPT_CLIENT_CREDENTIALS_USERS!);
} catch (e) {
  loggerService.error('Ignore :: error parsing client credentials users', e);
}

export default async ({ req, provider = '' }: any) => {
  const { api_token } = req.query;
  const regularToken = /^at_/.test(api_token);

  if (!api_token || !regularToken) {
    const message = 'A valid API token is required to access this API.';
    const error: { [key: string]: any } = new Error(message);
    error.code = 401;
    error.logging = {
      method: req.method,
      status_code: 401,
      message,
      path: req.path,
      api_mount: req.api_mount,
      headers: req.headers,
      body: undefined,
      query: req.query,
    };
    throw error;
  }

  const { headers } = req;
  const credentialKey = headers['x-credential-key'];
  const credentialValue = headers['x-credential-value'];

  let credential = null;

  if (credentialKey && credentialValue) {
    credential = {
      [credentialKey]: credentialValue,
    };
  }

  const cacheKey = `${api_token}_${provider}`;
  const [tokenCacheError, tokenCache] = await safePromise(
    cacheService.cacheGet(cacheKey),
  );
  if (tokenCacheError) {
    throw tokenCacheError;
  }

  let token = null;
  if (tokenCache) {
    try {
      token = JSON.parse(tokenCache);
      if (token && credential && CLIENT_CREDENTIALS_USERS.includes(token.user_ref_id)) {
        loggerService.info(
          `Cache: Bypass: Using client provided credentials for user ${token.user_ref_id} and provider ${provider}`,
        );
        return {
          cache: true,
          creds: {
            ...credential,
          },
          authToken: {
            ...credential,
          },
          user_ref_id: token.user_ref_id,
          moveNext: true,
        };
      }

      if (token) {
        loggerService.info(
          `Cache: Using cached creds for user (${token.user_ref_id}), provider:${provider}, provider_cache_key: ${cacheKey}`,
          Object.keys(token.creds),
        );
        let decrypted = token.creds;
        if (token.creds.encrypted) {
          try {
            decrypted = JSON.parse(cryptograper.decrypt(token.creds.encrypted.value));
            loggerService.info('Cached: provider creds keys', provider, Object.keys(decrypted));
          } catch (error) {
            const message = `There was an error decrypting ${provider} credential.`;
            loggerService.error(`cache:${message}`, error);
            const errorObj : { [key: string]: any} = new Error(message);
            errorObj.code = 500;
            throw errorObj;
          }
        }

        let oauth_creds : { [key: string]: any } = {};
        if (token.oauth_creds) {
          if (token.oauth_creds.encrypted) {
            try {
              oauth_creds = JSON.parse(cryptograper.decrypt(token.oauth_creds.encrypted.value));
              loggerService.info('cache: provider oauth_creds', provider, Object.keys(decrypted));
            } catch (error) {
              const message = `There was an error decrypting ${provider} credential.`;
              loggerService.error(`cache:${message}`, error);
              const errorObj : { [key: string]: any} = new Error(message);
              errorObj.code = 500;
              throw errorObj;
            }
          } else if (Object.keys(token.oauth_creds).length) {
            oauth_creds = token.oauth_creds;
          }
          if (token.oauth_creds.endpoint) {
            oauth_creds.endpoint = token.oauth_creds.endpoint;
          }
          if (token.oauth_creds.auth_endpoint) {
            oauth_creds.auth_endpoint = token.oauth_creds.auth_endpoint;
          }
          if (token.oauth_creds.subdomain) {
            oauth_creds.subdomain = token.oauth_creds.subdomain;
          }
        }

        let oauth_data;

        if (token.oauth_data) {
          oauth_data = token.oauth_data;
          // loggerService.info('provider data', provider, Object.keys(oauth_data));
        }

        const resp = {
          cache: true,
          creds: decrypted,
          oauth_creds,
          oauth_data,
          authToken: {
            ...decrypted,
            ...oauth_creds,
          },
          moveNext: true,
          user_ref_id: token.user_ref_id,
        };

        // FIX: Patch for custom twitter module
        if (provider === 'twitter' && decrypted.accessToken) {
          resp.authToken['OAUTH1.0a'] = {
            accessToken: decrypted.accessToken,
            refreshToken: decrypted.refreshToken,
          };
        }
        return resp;
      }
    } catch (e) {
      console.log('e', e);
    }
  }

  loggerService.info(`verifying api_token and trying to access ${provider} credential.`);
  const [tokenError, tokenStatus] = await safePromise(
    verifyTokenAndGetCreds({
      api_token,
      provider,
    }),
  );

  if (tokenError) {
    throw tokenError;
  }

  // Only token check
  if (tokenStatus && !tokenStatus.provider) {
    return tokenStatus;
  }

  const userCreds = tokenStatus;

  if (!userCreds || !userCreds.creds) {
    const message = `No ${provider} credential associated with this api_token.`;
    const error: { [key: string]: any } = new Error();
    error.code = 403;
    error.logging = {
      method: req.method,
      status_code: 403,
      message,
      path: req.path,
      api_mount: req.api_mount,
      headers: req.headers,
      body: undefined,
      query: req.query,
    };
    throw error;
  }

  if (credential && CLIENT_CREDENTIALS_USERS.includes(userCreds.user_ref_id)) {
    loggerService.info(
      `Bypass: using client provided credentials for user:${userCreds.user_ref_id} and provider: ${provider}`,
    );
    return {
      creds: {
        ...credential,
      },
      authToken: {
        ...credential,
      },
      user_ref_id: userCreds.user_ref_id,
      moveNext: true,
    };
  }

  // fallback from json type to string
  if (userCreds.creds && typeof userCreds.creds === 'string') {
    userCreds.creds = JSON.parse(userCreds.creds);
  }

  try {
    // Caching encrypted credential for fast read.
    const json = JSON.stringify(userCreds);
    const [credError] = await safePromise(
      cacheService.cacheSet(cacheKey, json, +CACHE_PROVIDER_CREDS_EXPIRY_TIME),
    );
    if (credError) {
      loggerService.error(credError);
    }
  } catch (e) {
    loggerService.error(e);
  }

  if (userCreds.creds) {
    let decrypted = userCreds.creds;
    if (userCreds.creds.encrypted) {
      try {
        decrypted = JSON.parse(cryptograper.decrypt(userCreds.creds.encrypted.value));
        loggerService.info(`provider: ${provider} creds keys`, Object.keys(decrypted));
      } catch (error) {
        const message = `There was an error decrypting ${provider} credential.`;
        loggerService.error(message, error);
        const errorObj : { [key: string]: any} = new Error(message);
        errorObj.code = 500;
        throw errorObj;
      }
    }

    let oauth_creds : { [key: string]: any } = {};
    if (userCreds.oauth_creds) {
      if (userCreds.oauth_creds.encrypted) {
        try {
          oauth_creds = JSON.parse(cryptograper.decrypt(userCreds.oauth_creds.encrypted.value));
          loggerService.info(`provider: ${provider} oauth_creds`, Object.keys(oauth_creds));
        } catch (error) {
          const message = `There was an error decrypting ${provider} OAuth credential.`;
          loggerService.error(message, error);
          const errorObj : { [key: string]: any} = new Error(message);
          errorObj.code = 500;
          throw errorObj;
        }
      } else if (Object.keys(userCreds.oauth_creds).length) {
        oauth_creds = userCreds.oauth_creds;
      }

      if (userCreds.oauth_creds.endpoint) {
        oauth_creds.endpoint = userCreds.oauth_creds.endpoint;
      }
      if (userCreds.oauth_creds.auth_endpoint) {
        oauth_creds.auth_endpoint = userCreds.oauth_creds.auth_endpoint;
      }
      if (userCreds.oauth_creds.subdomain) {
        oauth_creds.subdomain = userCreds.oauth_creds.subdomain;
      }
    }

    let oauth_data;

    if (userCreds.oauth_data) {
      oauth_data = userCreds.oauth_data;
      // loggerService.info('provider data', provider, Object.keys(oauth_data));
    }
    const resp = {
      creds: decrypted,
      oauth_creds,
      oauth_data,
      authToken: {
        ...decrypted,
        ...oauth_creds,
      },
      moveNext: true,
      user_ref_id: userCreds.user_ref_id,
    };

    // if (decrypted.accessToken) {
    //   // FIX: Patch for custom twitter module
    //   if (provider === 'twitter' && decrypted.accessToken) {
    //     resp.authToken['OAUTH1.0a'] = {
    //       accessToken: decrypted.accessToken,
    //       refreshToken: decrypted.refreshToken,
    //     };
    //   }
    // }

    return resp;
  }

  const message = 'Either the api_token is invalid or it is updated in your account.';
  const error: { [key: string]: any } = new Error(message);
  error.code = 401;
  error.logging = {
    method: req.method,
    status_code: 401,
    message,
    path: req.path,
    api_mount: req.api_mount,
    headers: req.headers,
    body: undefined,
    query: req.query,
  };
  throw error;
};
