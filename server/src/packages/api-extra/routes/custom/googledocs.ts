import express, { Application, Response, Router } from 'express';
import moment from 'moment';

import { safePromise, loggerService, logIntentRequest } from '../../../../utilities';
import logRequest from '../../../../utilities/request-log';
import formatFn from './format/googledocs';
import intents from '../../../../intents';
import generic from '../../../../api-dispatch';
import response from '../../../../utilities/response';

import creds from '../../../../auth-middleware';

const PROVIDER = 'googledocs';

let intent : any = null;

const { routes = null } = intents[PROVIDER];

if (routes && Array.isArray(routes) && routes.length) {
  const found = routes.filter((route) => route.provider_alias_intent === '/v1/documents/documentid');
  if (found && found.length) {
    [intent] = found;
  }
}

const router: Router = express.Router();

async function handlerWithApiToken(req: any) {
  const {
    api_token, format, documentId, document_id,
  } = req.query;

  const [credsError, userCreds] = await safePromise(
    creds.checkToken({
      req,
      api_token,
      provider: PROVIDER,
    }),
  );

  if (credsError) {
    throw credsError;
  }

  if (!userCreds || !userCreds.creds) {
    const error: any = new Error(
      'No auth token associated with this api_token, authenticate with twitter',
    );
    error.code = 401;
    throw error;
  }
  const { user_ref_id } = userCreds;
  // used for logging
  req.user_ref_id = user_ref_id;
  const doc_id = documentId || document_id;
  // const cache_key = `${user_ref_id}_${doc_id}`;

  // const [cacheError] = await safePromise(cacheService.cacheGet(cache_key));

  // if (cacheError) {
  //   loggerService.error('cacheError', cacheError);
  // }

  // const cache_duration = userCreds.cache_duration || CAHCE_KEY_EXPIRY_VALUE;

  // const cache_duration_key = `${cache_key}_duration`;

  const target = intent;

  if (!target) {
    loggerService.error(
      `googledocs.ts ${PROVIDER} targetPicker[provider] 'get' not found.`,
    );
    const error: { [key: string]: any } = new Error(
      'Unknown get request',
    );
    error.code = 422;
    throw error;
  }

  const [error, data] = await safePromise(
    generic({
      provider: PROVIDER,
      target,
      payload: {
        // NOTE: where to put the "format" field
        params: {
          documentId: doc_id,
        },
      },
      credsObj: {
        authToken: {
          accessToken: userCreds.creds.accessToken,
          refreshToken: userCreds.creds.refreshToken,
          ...userCreds.authToken,
        },
      },
    }),
  );

  if (error) {
    throw error;
  }

  // format data here
  const final: { [key: string]: any } = {};
  final.title = data.data.title;
  final.formats = ['text', 'markdown', 'json', 'raw'];
  final.data = {
    text: formatFn(data, 'text'),
    markdown: formatFn(data, 'markdown'),
    json: formatFn(data, 'json'),
    html: '',
    raw: data.data,
  };
  if (format) {
    final.formats = [format];
    final.data = {
      [format]: formatFn(data, format),
    };
  }

  // cacheService
  //   .cacheSet(cache_key, JSON.stringify(final), +CAHCE_KEY_EXPIRY_VALUE!)
  //   .catch((err: any) => {
  //     loggerService.info(`Cache set error cache_key ${cache_key}`, err);
  //   });

  // const cache_duration_time = moment()
  //   .utc()
  //   .add(cache_duration, 'seconds')
  //   .format();

  // cacheService
  //   .cacheSet(cache_duration_key, cache_duration_time, cache_duration + 2)
  //   .catch((err: any) => {
  //     loggerService.info(`Cache set error cache_key ${cache_key}`, err);
  //   });

  return final;
}

router.get('/googledocs/documentid/get', async (req: any, res) => {
  const started_at = moment().utc().format();
  const api_mount = '/googledocs/documentid/get';
  if (!req.query.api_token) {
    return res.status(403).json({
      message: 'api_token is required to access this endpoint.',
    });
  }
  const [error, data] = await safePromise(handlerWithApiToken(req));

  if (error) {
    const { code, message } = error.response || error;
    loggerService.error(error);
    res.status(code || 500).json({
      message,
    });
    await logIntentRequest(PROVIDER, 'get', api_mount, req.user_ref_id);

    return;
  }

  response(res, data, { provider: PROVIDER });
  const completed_at = moment().utc().format();
  const logging = {
    user_ref_id: req.user_ref_id || null,
    service_ref_id: null,
    cached: req.cached,
    method: req.method,
    provider: PROVIDER,
    status_code: 200,
    message: data.message,
    path: req.path,
    intent: api_mount,
    api_endpoint: null,
    client_request_headers: req.headers,
    provider_response_headers: null,
    query: {
      ...req.query,
      params: req.params,
    },
    body: undefined,
    params: req.params,
    data,
    started_at,
    completed_at,
  };
  // Is it good idea to calculate the data size here?
  // Stringify may slow down the system for next request;
  logRequest(logging);
  await logIntentRequest(PROVIDER, 'get', api_mount, req.user_ref_id);
});

export default (app : Application) => {
  if (!intents[PROVIDER]) {
    loggerService.info(
      `Skipping custom /googledocs routes, no intent found for provider ${PROVIDER}`,
    );
    return;
  }
  app.use('/', router);
};
