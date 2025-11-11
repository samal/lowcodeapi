import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import multer from 'multer';
import moment from 'moment';

import { loggerService, safePromise, logIntentRequest } from '../../../utilities';
import logRequest from '../../../utilities/request-log';
import { notify as notifyEvent } from '../../../utilities/notify';
import response from '../../../utilities/response';

import creds from '../../../auth-middleware';

import providers, { providerMap } from '../../../intents';
import fetchIntent from './fetch-intent';
import postIntent from './post-intent';

const router: any = express.Router();

const upload = multer({ dest: '/tmp' }).single('file');
const METHODS = ['GET', 'PATCH', 'POST', 'PUT', 'DELETE'];

// Removed unused variable response_key

const {
  PROTOCOL, UI_DOMAIN, APP_DOMAIN,
} = process.env;
const U_D = UI_DOMAIN || APP_DOMAIN;

const notify = async (error: any, options : any) => {
  const text = `
    Provider: ${options.provider}\n
    API code : ${error.code}\n

    \`\`\`
    ${JSON.stringify({
    ...error,
    client_headers: options.client_headers || null,
  }, null, 2)}
    \`\`\`
  `;

  await notifyEvent(text, true);
};
const errorResponse = (res: any, error: any, options: any, route: any, req: any) => {
  const { provider = '', client_headers } = options;
  loggerService.error('Error', error, provider);
  const pick: any = {
    307() {
      return res.redirect(`/?code=${error.code}`);
    },
    error() {
      res.status(error.code || 500).json({
        message: error.message || 'Request failed',
        // status_code: error.code,
        provider,
        error: error.data || error.errors || error.error || error,
        headers: error.headers,
      });
      const completed_at = moment().utc().format();
      const logging = {
        provider: options.provider,
        user_ref_id: req.user_ref_id || null,
        cached: req.cached,
        status_code: error.code || 500,
        message: error.message,
        method: req.method,
        path: req.path,
        intent: route.provider_alias_intent,
        api_endpoint: route.api_endpoint || route.meta.api_endpoint,
        client_request_headers: req.headers,
        provider_response_headers: error.headers,
        query: {
          ...req.query,
          params: req.params,
        },
        body: req.body,
        error: error.data || error.errors || error.error || error,
        params: req.params,
        started_at: req.started_at,
        completed_at,
      };

      // Is it good idea to calculate the data size here?
      // Stringify may slow down the system for next request;
      logRequest(logging);

      // send telegram notification
      return notify(error, { provider, client_headers });
    },
  };

  return pick[error.code] ? pick[error.code]() : pick.error();
};

// Standardize it.
const handleGetRequest = async (res: any, route: any, req: any, options: any = {}) => {
  const [error, resp] = await safePromise(fetchIntent(route, {
    ...options,
  }));

  if (error) {
    errorResponse(res, error, options, route, req);
    loggerService.error(error.logging);
    return error.logging || {};
  }

  const extra = { headers: resp.headers, provider: options.provider };
  response(res, resp.data, extra);
  const completed_at = moment().utc().format();
  const logging = {
    provider: options.provider,
    user_ref_id: req.user_ref_id || null,
    cached: req.cached,
    status_code: 200,
    message: resp.message,
    method: req.method,
    path: req.path,
    intent: route.provider_alias_intent,
    api_endpoint: route.api_endpoint || route.meta.api_endpoint,
    client_request_headers: req.headers,
    provider_response_headers: resp.headers,
    query: {
      ...req.query,
      params: req.params,
    },
    params: req.params,
    response: resp.data,
    started_at: req.started_at,
    completed_at,
  };

  // Is it good idea to calculate the data size here?
  // Stringify may slow down the system for next request;
  logRequest(logging);
};

// Standardize it.
const handlePostRequest = async (res: any, route: any, req: any, options: any = {}) => {
  const [error, resp] = await safePromise(postIntent(route, {
    ...options,
  }));

  if (error) {
    errorResponse(res, error, options, route, req);
    loggerService.error(error.logging);
    return error.logging || {};
  }

  const extra = { headers: resp.headers, provider: options.provider };
  response(res, resp.data, extra);
  const completed_at = moment().utc().format();
  const logging = {
    provider: options.provider,
    user_ref_id: req.user_ref_id || null,
    cached: req.cached,
    status_code: 200,
    message: resp.message,
    method: req.method,
    path: req.path,
    intent: route.provider_alias_intent,
    api_endpoint: route.api_endpoint || route.meta.api_endpoint,
    client_request_headers: req.headers,
    provider_response_headers: resp.headers,
    query: {
      ...req.query,
      params: req.params,
    },
    body: req.body,
    params: req.params,
    response: resp.data,
    started_at: req.started_at,
    completed_at,
  };

  // Is it good idea to calculate the data size here?
  // Stringify may slow down the system for next request;
  logRequest(logging);
};

const handler: any = {
  get: handleGetRequest,
  post: handlePostRequest,
  patch: handlePostRequest,
  put: handlePostRequest,
  delete: handlePostRequest,
};

Object.keys(providers).forEach((provider) => {
  const { routes, app } = providers[provider];
  const { auth } = providerMap[provider];
  const apiParams: any = {
    GET: {},
    POST: {},
    PUT: {},
    DELETE: {},
    PATCH: {},
  };

  Object.keys(apiParams).forEach((method) => {
    router[method.toLowerCase()](`/${provider}`, async (req: Request, res: Response) => {
      const { host } = req.headers;
      const redirect_host = U_D ? `${PROTOCOL}://${U_D}` : `${PROTOCOL}://${host}`;
      const redirect = `${redirect_host}?redirected_from=${host}/${provider}`;
      const error = {
        code: 302,
        message: `Redirected to ${redirect}`,
      };
      const options = {
        provider,
        app: {},
        query: req.query,
        params: req.params,
        body: req.body,
        client_headers: req.headers,
        method: req.method,
        apiParams: {},
      };
      await notify(error, options);
      return res.redirect(redirect);
    });
  });

  const providerRoutes = Array.isArray(routes) ? routes : Object.keys(routes);

  providerRoutes.forEach((route : string | { [key:string]: any}) => {
    const { params, method, provider_alias_intent } = typeof route === 'string' ? routes[route] : route;
    const query_params = params ? Object.keys(params) : [];
    if (METHODS.includes(method.toUpperCase())) {
      apiParams[method.toUpperCase()][provider_alias_intent] = {
        method,
        query_params,
      };
    }
  });

  const UPLOAD = ['file', 'upload', 'media'];
  providerRoutes.forEach((route : string | { [key:string]: any}) => {
    const intent = typeof route === 'string' ? routes[route] : route;

    const routePath = `/${provider}${intent.provider_alias_intent}`;
    const method = intent.method.toLowerCase();

    if (router[method]) { // mount path in http method
      router[method](routePath, async (req: any, res: Response, next: NextFunction) => {
        req.started_at = moment().utc().format();
        if (method === 'post' && intent.type && UPLOAD.includes(intent.type.toLowerCase())) {
          console.log('File upload', intent.provider_alias_intent);

          const options = {
            client_headers: req.headers,
            provider,
          };

          try {
            await notify({
              message: 'File upload request',
            }, options);
          } catch (e) {
            loggerService.error('Notify failed.');
          }

          // FIXME: Unauthorized access
          upload(req, res, (err) => {
            if (err instanceof multer.MulterError) {
              // A Multer error occurred when uploading.
              console.log('Multer error', err);
            } else if (err) {
              // An unknown error occurred when uploading.
              console.log('Multer error 2', err);
            }

            const file: { [key:string]: any } = req.file || {};
            if (file && file.path) {
              fs.rename(file.path, `/tmp/${file?.originalname}`, () => {
                next();
              });
            } else {
              const error: any = new Error('File missing');
              error.code = 422;
              return errorResponse(res, error, {
                client_headers: req.headers,
              }, {}, req);
            }
          });
        } else {
          next();
        }
      }, async (req: any, res: any) => {
        loggerService.info(`\n\nServing ${method} ${req.path} for ${provider}.`);
        const {
          query, params, body, file, headers,
        } = req;
        req.route = intent.provider_alias_intent;
        req.api_mount = req.params.mount;

        const routeMap = intent;

        if (!routeMap.auth || !routeMap.auth.length) {
          if (auth) {
            routeMap.auth = auth;
          }
        }
        loggerService.info(`API Detail: ${intent.text}\n`);

        if (!routeMap) {
          const message = 'The requested API is not found.';
          const error: {[key:string]: any} = new Error(message);
          error.code = 404;
          error.logging = {
            method: req.method,
            status_code: 404,
            message,
            path: req.path,
            api_mount: req.api_mount,
            headers: req.headers,
            body: undefined,
            query: req.query,
          };
          return errorResponse(res, error, {
            provider,
            app: {},
            query,
            params,
            body,
            client_headers: req.headers,
            method: req.method,
            apiParams: apiParams[method.toUpperCase()] || {},
          }, {}, req);
        }

        // TODO: move this before upload
        const [tError, data] = await safePromise(creds.checkToken({ req, provider }));
        if (tError) {
          const error: any = new Error(tError.message);
          error.code = tError.code;
          error.logging = tError.logging;
          errorResponse(res, error, {
            provider,
            app: {},
            query,
            params,
            body,
            client_headers: req.headers,
            method: req.method,
            apiParams: apiParams[method.toUpperCase()] || {},
          }, routeMap, req);
          return error.logging || {};
        }

        const { authToken, moveNext, user_ref_id } = data;
        req.user_ref_id = user_ref_id;

        if (!moveNext) {
          const error: any = new Error('Some issue');
          error.code = 422;
          errorResponse(res, error, {
            client_headers: req.headers,
          }, routeMap, req);
          loggerService.error(error.logging);
          return error.logging || {};
        }

        await safePromise(handler[method](res, routeMap, req, {
          provider,
          app: {
            ...app,
            authToken,
            credsObj: data,
          },
          query,
          params,
          headers,
          body,
          file,
          method: req.method,
          apiParams: apiParams[method.toUpperCase()] || {},
        }));
        // track api request
        await logIntentRequest(provider, method, intent.provider_alias_intent, user_ref_id);
      });

      /*
      * All API must be proxied to the provider's actual route
      */
      if (intent.provider_proxy_intent && routePath !== intent.provider_proxy_intent) {
        const routeProxyPath = `/${provider}${intent.provider_proxy_intent}`.replace(/[}>]/g, '').replace(/[{<]/g, ':').trim();
        // console.log('Proxy route', routeProxyPath);
        router[method](routeProxyPath, async (req: any, res: Response, next: NextFunction) => {
          req.started_at = moment().utc().format();
          if (method === 'post' && intent.type && UPLOAD.includes(intent.type.toLowerCase())) {
            console.log('File upload', intent.provider_alias_intent);

            const options = {
              client_headers: req.headers,
              provider,
            };

            try {
              await notify({
                message: 'File upload request',
              }, options);
            } catch (e) {
              loggerService.error('Notify failed.');
            }

            // FIXME: Unauthorized access
            upload(req, res, (err) => {
              if (err instanceof multer.MulterError) {
                // A Multer error occurred when uploading.
                console.log('Multer error', err);
              } else if (err) {
                // An unknown error occurred when uploading.
                console.log('Multer error 2', err);
              }

              const file: { [key:string]: any } = req.file || {};
              if (file && file.path) {
                fs.rename(file.path, `/tmp/${file?.originalname}`, () => {
                  next();
                });
              } else {
                const error: any = new Error('File missing');
                error.code = 422;
                return errorResponse(res, error, {
                  client_headers: req.headers,
                }, {}, req);
              }
            });
          } else {
            next();
          }
        }, async (req: any, res: any) => {
          loggerService.info(`\n\nServing ${method} ${req.path} for ${provider}.`);
          const {
            query, params, body, file, headers,
          } = req;
          req.route = route;
          req.api_mount = req.params.mount;

          const routeMap = routes[req.route.replace('/', '')];

          if (!routeMap.auth || !routeMap.auth.length) {
            if (auth) {
              routeMap.auth = auth;
            }
          }
          loggerService.info(`API Detail: ${intent.text}\n`);

          if (!routeMap) {
            const message = 'The requested API is not found.';
            const error: {[key:string]: any} = new Error(message);
            error.code = 404;
            error.logging = {
              method: req.method,
              status_code: 404,
              message,
              path: req.path,
              api_mount: req.api_mount,
              headers: req.headers,
              body: undefined,
              query: req.query,
            };
            return errorResponse(res, error, {
              provider,
              app: {},
              query,
              params,
              body,
              client_headers: req.headers,
              method: req.method,
              apiParams: apiParams[method.toUpperCase()] || {},
            }, {}, req);
          }

          // TODO: move this before upload
          const [tError, data] = await safePromise(creds.checkToken({ req, provider }));
          if (tError) {
            const error: any = new Error(tError.message);
            error.code = tError.code;
            error.logging = tError.logging;
            errorResponse(res, error, {
              provider,
              app: {},
              query,
              params,
              body,
              client_headers: req.headers,
              method: req.method,
              apiParams: apiParams[method.toUpperCase()] || {},
            }, routeMap, req);
            return error.logging || {};
          }

          const { authToken, moveNext, user_ref_id } = data;
          req.user_ref_id = user_ref_id;

          if (!moveNext) {
            const error: any = new Error('Some issue');
            error.code = 422;
            errorResponse(res, error, {
              client_headers: req.headers,
            }, routeMap, req);
            loggerService.error(error.logging);
            return error.logging || {};
          }

          await safePromise(handler[method](res, routeMap, req, {
            provider,
            app: {
              ...app,
              authToken,
              credsObj: data,
            },
            query,
            params,
            headers,
            body,
            file,
            method: req.method,
            apiParams: apiParams[method.toUpperCase()] || {},
          }));
          // track api request
          await logIntentRequest(provider, method, intent.provider_alias_intent, user_ref_id);
        });
      }
    }
  });
});

export default router;
