import express, { Application, Response, Router } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(utc);
dayjs.extend(relativeTime);

import config from '../../../../config';
import {
  safePromise, loggerService, cacheService, logIntentRequest,
} from '../../../../utilities';
import logRequest from '../../../../utilities/request-log';
import intentsMap from '../../../../intents';
import generic from '../../../../api-dispatch';
import response from '../../../../utilities/response';

import creds from '../../../../auth-middleware';

const { CAHCE_KEY_EXPIRY_VALUE } = config;

const DEFAULT_API_DATA_LIMIT = 1000;

const router: Router = express.Router();

const PROVIDER = 'googlesheets';

const { routes = [] } = intentsMap[PROVIDER];

const intentsRouteMap : { [key: string]: any} = {};

routes.forEach((route: { [key: string]: any}) => {
  intentsRouteMap[`${route.provider_alias_intent}___${route.method}`.toLowerCase()] = route;
});

const intent = {
  spreadsheets___get: intentsRouteMap['/v4/spreadsheets/spreadsheetid___get'],
  values__range___get: intentsRouteMap['/v4/spreadsheets/spreadsheetid/values/range__get'],
  values_batchgetbydatafilter___post: intentsRouteMap['/v4/spreadsheets/spreadsheetid/values-batchgetbydatafilter___post'],
  batchupdate___post: intentsRouteMap['/v4/spreadsheets/spreadsheetid-batchupdate___post'],
  values__range_append___post: intentsRouteMap['/v4/spreadsheets/spreadsheetid/values/range-append___post'],
  values__range_clear___post: intentsRouteMap['/v4/spreadsheets/spreadsheetid/values/range-clear___post'],
};
async function getHandlerWithApiToken(req: any) {
  const { spreadsheetId: sheet_id } = req.query;
  const {
    tab,
    gid,
    row = 2,
    // eslint-disable-next-line no-unused-vars
    api_token,
    lookup = '',
    format,
    cache_burst,
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

  if (
    !userCreds
    || !userCreds.creds
    || !userCreds.creds.accessToken
    || !userCreds.creds.refreshToken
  ) {
    const error: any = new Error(
      'No access token associated with this api_token, authorize your Googlesheet to access the data.',
    );
    error.code = 401;
    throw error;
  }
  const { user_ref_id } = userCreds;
  // used for logging
  req.user_ref_id = user_ref_id;

  // TODO: Check for token credits using cache
  // ******************Pending****************
  // END

  const cache_duration = userCreds.cache_duration || CAHCE_KEY_EXPIRY_VALUE || 30;

  let cache_key = `${user_ref_id}_${sheet_id}`;

  if (gid) {
    cache_key = `${cache_key}_${gid}`;
  }

  if (!gid && tab) {
    cache_key = `${cache_key}_${tab}`;
  }

  if (lookup) {
    cache_key = `${cache_key}_${lookup}`;
  }

  const cache_duration_key = `${cache_key}_duration`;

  if (!cache_burst) {
    const [cacheError, cachedData] = await safePromise(
      cacheService.cacheGet(cache_key),
    );

    if (cacheError) {
      loggerService.error('cacheError', cacheError);
    }

    if (cachedData) {
      // eslint-disable-next-line no-unused-vars
      const [cachedError, cachedStatus] = await safePromise(
        cacheService.cacheGet(cache_duration_key),
      );
      req.cached = true;
      const data = JSON.parse(cachedData);
      return {
        message: data.message || '',
        info: {
          cache_message: cachedStatus
            ? `Cache will get invalidated ${dayjs(cachedStatus).fromNow()}.`
            : 'Data is cached',
          cache_expiry_at: cachedStatus,
          cache: true,
          ...data.meta,
        },
        data: data.data,
      };
    }
  }

  let target = null;

  if (tab && intent && intent.values__range___get) {
    target = intent.values__range___get;
  } else if (
    intent
    && intent.values_batchgetbydatafilter___post
  ) {
    target = intent.values_batchgetbydatafilter___post;
  }

  if (!target) {
    loggerService.error(`googlesheet.ts ${PROVIDER} targetPicker[provider] 'value_get' or 'values_batchgetbydatafilter___post ' not found.`);
    const error: { [key: string]: any } = new Error('Unknown request');
    error.code = 422;
    throw error;
  }

  const payloadOptions = {
    provider: PROVIDER,
    target,
    payload: {
      params: {
        spreadsheetId: sheet_id,
        range: tab,
      },
      body: {} as any,
    },
    credsObj: {
      authToken: {
        accessToken: userCreds.creds.accessToken,
        refreshToken: userCreds.creds.refreshToken,
        ...userCreds.authToken,
      },
    },
  };

  if (!tab && gid) {
    payloadOptions.payload = {
      params: {
        spreadsheetId: sheet_id,
        range: null,
      },
      body:
          {
            dataFilters: {
              gridRange: {
                sheetId: gid,
              },
            },
          },
    };
  }
  const [error, result] = await safePromise(generic(payloadOptions));

  if (error) {
    throw error;
  }

  // result.data.valueRanges[0].valueRange.values <--- Map return by values.batchGetByDataFilter
  // result.data.values <--- Map return by values.get
  const xMessage: any = {};

  // NOTE: Empty sheet handling
  if (tab && !result.data.values) {
    return [[], xMessage];
  } if (!tab && gid && !result.data.valueRanges[0].valueRange.values) {
    return [[], xMessage];
  }

  let rows: Array<any> = result.data.valueRanges && result.data.valueRanges.length
    ? result.data.valueRanges[0].valueRange.values
    : result.data.values;

  if (format === 'raw') {
    return [[...rows], xMessage]; // Returning raw format
  }

  // Splits the array into two.
  const headers = rows.splice(0, row - 1);

  const dataHeader = headers.pop();
  const responseHeader = headers.shift();
  const responseMessage = headers.shift();

  // Format response message
  if (responseMessage && responseMessage.length && responseHeader && responseHeader.length) {
    responseMessage.forEach((messages: any, index: number) => {
      xMessage[responseHeader[index]] = messages;
    });
  }

  const api_total_rows_limit = 2000;
  const final: any = lookup ? {} : [];
  loggerService.info('Data length check', { api_total_rows_limit, DEFAULT_API_DATA_LIMIT, total: rows.length });
  if (+rows.length > api_total_rows_limit
    || (DEFAULT_API_DATA_LIMIT && +rows.length > +DEFAULT_API_DATA_LIMIT)) {
    xMessage.data_size_limit_message = `Data size limit is ${
      api_total_rows_limit || DEFAULT_API_DATA_LIMIT
    }`;
  }
  rows = rows.splice(0, api_total_rows_limit || DEFAULT_API_DATA_LIMIT);
  rows.forEach((row: Array<string>) => {
    const xform: { [key: string]: any } = {};
    row.forEach((data, index) => {
      xform[dataHeader[index]] = data;
    });
    if (lookup) {
      final[xform[lookup]] = xform;
    } else {
      final.push(xform);
    }
  });
  const others = {
    ...xMessage,
  };

  if (final && (final.length || Object.keys(final).length) && !cache_burst) {
    cacheService
      .cacheSet(cache_key, JSON.stringify({ data: final, meta: others }), cache_duration)
      .catch((err: any) => {
        loggerService.info(`Cache set error cache_key ${cache_key}`, err);
      });

    const cache_duration_time = dayjs()
      .utc()
      .add(cache_duration, 'seconds')
      .format();

    cacheService
      .cacheSet(cache_duration_key, cache_duration_time, cache_duration + 2)
      .catch((err: any) => {
        loggerService.info(`Cache set error cache_duration_key ${cache_duration_key}`, err);
      });
  }

  return {
    info: {
      ...others,
    },
    data: final,
  };
}

// Auth required
async function handlerReplace(req: any) {
  const { spreadsheetId: sheet_id } = req.query;
  const { tab, rows, gid } = req.body;
  const { api_token } = req.query;

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

  // used for logging
  req.user_ref_id = userCreds.user_ref_id;

  if (!userCreds || !userCreds.creds) {
    const error: any = new Error(
      'Some error accessing your googlesheet access token.',
    );
    error.code = 401;
    throw error;
  }

  let target = null;

  if (intent && intent.batchupdate___post) {
    target = intent.batchupdate___post;
  }

  if (!target) {
    loggerService.error(
      `googlesheet.ts ${PROVIDER} targetPicker[provider] 'batchupdate___post' not found.`,
    );
    const error: { [key: string]: any } = new Error(
      'Unknown provider request',
    );
    error.code = 422;
    throw error;
  }

  const [error, resp] = await safePromise(
    generic({
      provider: PROVIDER,
      target,
      payload: {
        params: {
          spreadsheetId: sheet_id,
        },
        body: {
          requests: [
            {
              updateCells: {
                range: {
                  sheetId: gid || tab,
                  startRowIndex: 0,
                },
                fields: '*',
                rows,
              },
            },
          ],
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

  // googlesheet({
  //   routeMap: {
  //     provider_key: sheet_id,
  //     provider_intent: 'batchUpdateCustom',
  //     provider_config: {
  //       gid,
  //       range: tab,
  //     },
  //     data: rows,
  //   },
  //   app: {},
  //   authToken: {
  //     accessToken: userCreds.creds.accessToken,
  //     refreshToken: userCreds.creds.refreshToken,
  //     ...userCreds.authToken,
  //   },
  // })

  if (error) {
    throw error;
  }

  return {
    data: resp,
  };
}

async function appendHandler(req: any) {
  const { spreadsheetId: sheet_id } = req.query;
  const { tab, data } = req.body;
  const { api_token } = req.query;

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

  // used for logging
  req.user_ref_id = userCreds.user_ref_id;

  if (!userCreds || !userCreds.creds) {
    const error: any = new Error(
      'Some error accessing your googlesheet access token.',
    );
    error.code = 401;
    throw error;
  }

  let target = null;

  if (intent && intent.values__range_append___post) {
    target = intent.values__range_append___post;
  }

  if (!target) {
    loggerService.error(
      `googlesheet.ts ${PROVIDER} targetPicker[provider] 'values__range_append___post' not found.`,
    );
    const error: { [key: string]: any } = new Error(
      'Unknown provider request',
    );
    error.code = 422;
    throw error;
  }

  const [error, resp] = await safePromise(
    generic({
      provider: PROVIDER,
      target,
      payload: {
        params: {
          spreadsheetId: sheet_id,
          range: tab,
          valueInputOption: 'RAW',
        },
        body: {
          values: data,
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

  return {
    data: resp.data,
  };
}

async function clearHandler(req: any) {
  const { spreadsheetId: sheet_id } = req.query;
  const { tab } = req.body;
  const { api_token } = req.query;

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

  // used for logging
  req.user_ref_id = userCreds.user_ref_id;

  if (!userCreds || !userCreds.creds) {
    const error: any = new Error(
      'Some error accessing your googlesheet access token.',
    );
    error.code = 401;
    throw error;
  }

  let target = null;

  if (intent && intent.values__range_clear___post) {
    target = intent.values__range_clear___post;
  }

  if (!target) {
    loggerService.error(
      `googlesheet.ts ${PROVIDER} targetPicker[provider] 'values__range_clear___post' not found.`,
    );
    const error: { [key: string]: any } = new Error(
      'Unknown provider request',
    );
    error.code = 422;
    throw error;
  }

  const [error, resp] = await safePromise(
    generic({
      provider: PROVIDER,
      target,
      payload: {
        params: {
          spreadsheetId: sheet_id,
          range: tab,
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

  return {
    data: resp,
  };
}

async function addSheetHandler(req: any) {
  const { spreadsheetId: sheet_id } = req.query;
  const { tab, gid } = req.body;
  const { api_token } = req.query;

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

  // used for logging
  req.user_ref_id = userCreds.user_ref_id;

  if (!userCreds || !userCreds.creds) {
    const error: any = new Error(
      'Some error accessing your googlesheet access token.',
    );
    error.code = 401;
    throw error;
  }

  let target = null;

  if (intent && intent.batchupdate___post) {
    target = intent.batchupdate___post;
  }

  if (!target) {
    loggerService.error(
      `googlesheet.ts ${PROVIDER} targetPicker[provider] 'batchupdate___post' not found.`,
    );
    const error: { [key: string]: any } = new Error(
      'Unknown provider request',
    );
    error.code = 422;
    throw error;
  }

  const [error, resp] = await safePromise(
    generic({
      provider: PROVIDER,
      target,
      payload: {
        params: {
          spreadsheetId: sheet_id,
        },
        body: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: tab,
                  sheetId: gid,
                },
              },
            },
          ],
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

  return {
    data: resp,
  };
}

async function removeSheetHandler(req: any) {
  const { spreadsheetId: sheet_id } = req.query;
  const { gid } = req.body;
  const { api_token } = req.query;

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

  // used for logging
  req.user_ref_id = userCreds.user_ref_id;

  if (!userCreds || !userCreds.creds) {
    const error: any = new Error(
      'Some error accessing your googlesheet access token.',
    );
    error.code = 401;
    throw error;
  }
  let target = null;

  if (intent && intent.batchupdate___post) {
    target = intent.batchupdate___post;
  }

  if (!target) {
    loggerService.error(
      `googlesheet.ts ${PROVIDER} targetPicker[provider] 'batchupdate___post' not found.`,
    );
    const error: { [key: string]: any } = new Error(
      'Unknown provider request',
    );
    error.code = 422;
    throw error;
  }
  const [error, resp] = await safePromise(
    generic({
      provider: PROVIDER,
      target,
      payload: {
        params: {
          spreadsheetId: sheet_id,
        },
        body: {
          requests: [
            {
              deleteSheet: {
                sheetId: gid,
              },
            },
          ],
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

  return {
    data: resp,
  };
}

async function getSheetsHandler(req: any) {
  const { spreadsheetId: sheet_id } = req.query;
  const { api_token } = req.query;

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

  // used for logging
  req.user_ref_id = userCreds.user_ref_id;

  if (!userCreds || !userCreds.creds) {
    const error: any = new Error(
      'Some error accessing your googlesheet access token.',
    );
    error.code = 401;
    throw error;
  }

  let target = null;

  if (intent
    && intent.spreadsheets___get) {
    target = intent.spreadsheets___get;
  }

  if (!target) {
    loggerService.error(
      `googlesheet.ts ${PROVIDER} targetPicker[provider] 'spreadsheets___get' not found.`,
    );
    const error: { [key: string]: any } = new Error(
      'Unknown provider request',
    );
    error.code = 422;
    throw error;
  }

  const [error, resp] = await safePromise(
    generic({
      provider: PROVIDER,
      target,
      payload: {
        params: {
          spreadsheetId: sheet_id,
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

  return {
    data: resp.data,
  };
}

const apiBase = ['spreadsheets', 'googlesheets'];

apiBase.forEach((base) => {
  router.get(`/${base}/spreadsheetid/get`, async (req: any, res: Response) => {
    const started_at = dayjs().utc().format();
    const api_mount = '/spreadsheetid/get';
    if (!req.query.api_token) {
      return res.status(403).json({
        message: 'api_token is required to access this endpoint.',
      });
    }
    if (!req.query.tab && !req.query.gid) {
      return res.status(422).json({
        message:
          'Either tab or gid is required to access googlesheet data, pass any one in query parameter to access the data.',
      });
    }
    const [error, data] = await safePromise(getHandlerWithApiToken(req));

    if (error) {
      const {
        status,
        data = {},
        code,
        message,
        errors,
      } = error.response || error;
      const statusCode = status || code || 500;
      const text = data.message || message || errors;
      const completed_at = dayjs().utc().format();
      res.status(statusCode).json({
        message: text,
        error: data.error,
      });
      const logging = {
        user_ref_id: req.user_ref_id || null,
        service_ref_id: null,
        cached: req.cached,
        method: req.method,
        status_code: statusCode,
        message: error.message,
        provider: PROVIDER,
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
        error,
        started_at,
        completed_at,
      };
      // Is it good idea to calculate the data size here?
      // Stringify may slow down the system for next request;
      logRequest(logging);
      await logIntentRequest(PROVIDER, 'get', api_mount, req.user_ref_id);
      return;
    }

    const result = {
      ...data,
    };
    response(res, result, { provider: 'googlesheets' });
    const completed_at = dayjs().utc().format();
    const logging = {
      user_ref_id: req.user_ref_id || null,
      service_ref_id: null,
      cached: req.cached,
      provider: 'googlesheets',
      method: req.method,
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
      response: data,
      started_at,
      completed_at,
    };
    // Is it good idea to calculate the data size here?
    // Stringify may slow down the system for next request;
    logRequest(logging);
    await logIntentRequest(PROVIDER, 'get', api_mount, req.user_ref_id);
  });
  router.post(`/${base}/spreadsheetid/update`, async (req: any, res: Response) => {
    const started_at = dayjs().utc().format();
    const api_mount = '/spreadsheetid/update';

    if (!req.query.api_token) {
      return res.status(403).json({
        message: 'api_token is required to access this endpoint.',
      });
    }

    const [error, data] = await safePromise(handlerReplace(req));
    if (error) {
      const {
        status,
        data = {},
        code,
        message,
        errors,
      } = error.response || error;
      const statusCode = status || code || 500;
      const text = data.message || message || errors;
      const completed_at = dayjs().utc().format();
      const logging = {
        user_ref_id: req.user_ref_id || null,
        service_ref_id: null,
        cached: req.cached,
        method: req.method,
        provider: PROVIDER,
        status_code: statusCode,
        message: error.message,
        path: req.path,
        intent: api_mount,
        api_endpoint: null,
        client_request_headers: req.headers,
        provider_response_headers: null,
        query: {
          ...req.query,
          params: req.params,
        },
        body: req.body,
        params: req.params,
        error,
        started_at,
        completed_at,
      };
      res.status(statusCode).json({
        message: text,
      });

      // Is it good idea to calculate the data size here?
      // Stringify may slow down the system for next request;
      logRequest(logging);
      await logIntentRequest(PROVIDER, 'post', api_mount, req.user_ref_id);
      return;
    }

    response(res, data.data, { provider: 'googlesheets' });
    const completed_at = dayjs().utc().format();
    const logging = {
      user_ref_id: req.user_ref_id || null,
      service_ref_id: null,
      cached: req.cached,
      provider: 'googlesheets',
      method: req.method,
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
      body: req.body,
      params: req.params,
      response: data,
      started_at,
      completed_at,
    };
    // Is it good idea to calculate the data size here?
    // Stringify may slow down the system for next request;
    logRequest(logging);
    await logIntentRequest(PROVIDER, 'post', api_mount, req.user_ref_id);
  });
  router.post(`/${base}/spreadsheetid/append`, async (req: any, res: Response) => {
    const started_at = dayjs().utc().format();
    const api_mount = '/spreadsheetid/append';

    if (!req.query.api_token) {
      return res.status(403).json({
        message: 'api_token is required to access this endpoint.',
      });
    }

    const [error, data] = await safePromise(appendHandler(req));
    if (error) {
      const {
        status,
        data = {},
        code,
        message,
        errors,
      } = error.response || error;
      const statusCode = status || code || 500;
      const text = data.message || message || errors;
      const completed_at = dayjs().utc().format();
      const logging = {
        user_ref_id: req.user_ref_id || null,
        service_ref_id: null,
        cached: req.cached,
        method: req.method,
        status_code: statusCode,
        provider: PROVIDER,
        message: error.message,
        path: req.path,
        intent: api_mount,
        api_endpoint: null,
        client_request_headers: req.headers,
        provider_response_headers: null,
        query: {
          ...req.query,
          params: req.params,
        },
        body: req.body,
        params: req.params,
        error,
        started_at,
        completed_at,
      };

      res.status(statusCode).json({
        message: text,
      });
      // Is it good idea to calculate the data size here?
      // Stringify may slow down the system for next request;
      logRequest(logging);
      await logIntentRequest(PROVIDER, 'post', api_mount, req.user_ref_id);
      return;
    }

    response(res, data.data, { provider: 'googlesheets' });
    const completed_at = dayjs().utc().format();
    const logging = {
      user_ref_id: req.user_ref_id || null,
      service_ref_id: null,
      cached: req.cached,
      provider: 'googlesheets',
      method: req.method,
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
      body: req.body,
      params: req.params,
      response: data,
      started_at,
      completed_at,
    };
    // Is it good idea to calculate the data size here?
    // Stringify may slow down the system for next request;
    logRequest(logging);
    await logIntentRequest(PROVIDER, 'post', api_mount, req.user_ref_id);
  });
  router.post(`/${base}/spreadsheetid/clear`, async (req: any, res: Response) => {
    const started_at = dayjs().utc().format();
    const api_mount = '/spreadsheetid/clear';

    if (!req.query.api_token) {
      return res.status(403).json({
        message: 'api_token is required to access this endpoint.',
      });
    }

    const [error, data] = await safePromise(clearHandler(req));
    if (error) {
      const {
        status,
        data = {},
        code,
        message,
        errors,
      } = error.response || error;
      const statusCode = status || code || 500;
      const text = data.message || message || errors;
      const completed_at = dayjs().utc().format();
      const logging = {
        user_ref_id: req.user_ref_id || null,
        service_ref_id: null,
        cached: req.cached,
        method: req.method,
        status_code: statusCode,
        provider: PROVIDER,
        message: error.message,
        path: req.path,
        intent: api_mount,
        api_endpoint: null,
        client_request_headers: req.headers,
        provider_response_headers: null,
        query: {
          ...req.query,
          params: req.params,
        },
        body: req.body,
        params: req.params,
        error,
        started_at,
        completed_at,
      };

      res.status(statusCode).json({
        message: text,
      });
      // Is it good idea to calculate the data size here?
      // Stringify may slow down the system for next request;
      logRequest(logging);
      await logIntentRequest(PROVIDER, 'post', api_mount, req.user_ref_id);
      return;
    }

    response(res, data.data, { provider: 'googlesheets' });
    const completed_at = dayjs().utc().format();
    const logging = {
      user_ref_id: req.user_ref_id || null,
      service_ref_id: null,
      cached: req.cached,
      provider: 'googlesheets',
      method: req.method,
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
      body: req.body,
      params: req.params,
      response: data,
      started_at,
      completed_at,
    };
    // Is it good idea to calculate the data size here?
    // Stringify may slow down the system for next request;
    logRequest(logging);
    await logIntentRequest(PROVIDER, 'post', api_mount, req.user_ref_id);
  });
  router.post(`/${base}/spreadsheetid/add`, async (req: any, res: Response) => {
    const started_at = dayjs().utc().format();
    const api_mount = '/spreadsheetid/add';

    if (!req.query.api_token) {
      return res.status(403).json({
        message: 'api_token is required to access this endpoint.',
      });
    }

    const [error, data] = await safePromise(addSheetHandler(req));
    if (error) {
      const {
        status,
        data = {},
        code,
        message,
        errors,
      } = error.response || error;
      const statusCode = status || code || 500;
      const text = data.message || message || errors;
      const completed_at = dayjs().utc().format();
      const logging = {
        user_ref_id: req.user_ref_id || null,
        service_ref_id: null,
        cached: req.cached,
        method: req.method,
        status_code: statusCode,
        provider: PROVIDER,
        message: error.message,
        path: req.path,
        intent: api_mount,
        api_endpoint: null,
        client_request_headers: req.headers,
        provider_response_headers: null,
        query: {
          ...req.query,
          params: req.params,
        },
        body: req.body,
        params: req.params,
        error,
        started_at,
        completed_at,
      };

      res.status(statusCode).json({
        message: text,
      });
      // Is it good idea to calculate the data size here?
      // Stringify may slow down the system for next request;
      logRequest(logging);
      await logIntentRequest(PROVIDER, 'post', api_mount, req.user_ref_id);
      return;
    }

    response(res, data.data, { provider: 'googlesheets' });
    const completed_at = dayjs().utc().format();
    const logging = {
      user_ref_id: req.user_ref_id || null,
      service_ref_id: null,
      cached: req.cached,
      provider: 'googlesheets',
      method: req.method,
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
      body: req.body,
      params: req.params,
      respones: data,
      started_at,
      completed_at,
    };
    // Is it good idea to calculate the data size here?
    // Stringify may slow down the system for next request;
    logRequest(logging);
    await logIntentRequest(PROVIDER, 'post', api_mount, req.user_ref_id);
  });
  router.post(`/${base}/spreadsheetid/remove`, async (req: any, res: Response) => {
    const started_at = dayjs().utc().format();
    const api_mount = '/spreadsheetid/remove';

    if (!req.query.api_token) {
      return res.status(403).json({
        message: 'api_token is required to access this endpoint.',
      });
    }

    const [error, data] = await safePromise(removeSheetHandler(req));
    if (error) {
      const {
        status,
        data = {},
        code,
        message,
        errors,
      } = error.response || error;
      const statusCode = status || code || 500;
      const text = data.message || message || errors;
      const completed_at = dayjs().utc().format();
      const logging = {
        user_ref_id: req.user_ref_id || null,
        service_ref_id: null,
        cached: req.cached,
        method: req.method,
        status_code: statusCode,
        provider: PROVIDER,
        message: error.message,
        path: req.path,
        intent: api_mount,
        api_endpoint: null,
        client_request_headers: req.headers,
        provider_response_headers: null,
        query: {
          ...req.query,
          params: req.params,
        },
        body: req.body,
        params: req.params,
        error,
        started_at,
        completed_at,
      };

      res.status(statusCode).json({
        message: text,
      });
      // Is it good idea to calculate the data size here?
      // Stringify may slow down the system for next request;
      logRequest(logging);
      await logIntentRequest(PROVIDER, 'post', api_mount, req.user_ref_id);
      return;
    }

    response(res, data.data, { provider: 'googlesheets' });
    const completed_at = dayjs().utc().format();
    const logging = {
      user_ref_id: req.user_ref_id || null,
      service_ref_id: null,
      cached: req.cached,
      provider: 'googlesheets',
      method: req.method,
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
      body: req.body,
      params: req.params,
      response: data,
      started_at,
      completed_at,
    };
    // Is it good idea to calculate the data size here?
    // Stringify may slow down the system for next request;
    logRequest(logging);
    await logIntentRequest(PROVIDER, 'post', api_mount, req.user_ref_id);
  });
  router.get(`/${base}/spreadsheetid/sheets`, async (req: any, res: Response) => {
    const started_at = dayjs().utc().format();
    const api_mount = '/spreadsheetid/sheets';

    if (!req.query.api_token) {
      return res.status(403).json({
        message: 'api_token is required to access this endpoint.',
      });
    }

    const [error, data] = await safePromise(getSheetsHandler(req));
    if (error) {
      const {
        status,
        data = {},
        code,
        message,
        errors,
      } = error.response || error;
      const statusCode = status || code || 500;
      const text = data.message || message || errors;
      const completed_at = dayjs().utc().format();
      const logging = {
        user_ref_id: req.user_ref_id || null,
        service_ref_id: null,
        cached: req.cached,
        method: req.method,
        status_code: statusCode,
        provider: PROVIDER,
        message: error.message,
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
        error,
        started_at,
        completed_at,
      };

      res.status(statusCode).json({
        message: text,
      });
      // Is it good idea to calculate the data size here?
      // Stringify may slow down the system for next request;
      logRequest(logging);
      await logIntentRequest(PROVIDER, 'get', api_mount, req.user_ref_id);
      return;
    }

    response(res, data.data, { provider: 'googlesheets' });
    const completed_at = dayjs().utc().format();
    const logging = {
      user_ref_id: req.user_ref_id || null,
      service_ref_id: null,
      cached: req.cached,
      provider: 'googlesheets',
      method: req.method,
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
      response: data,
      started_at,
      completed_at,
    };
    // Is it good idea to calculate the data size here?
    // Stringify may slow down the system for next request;
    logRequest(logging);
    await logIntentRequest(PROVIDER, 'get', api_mount, req.user_ref_id);
  });
});

export default (app: Application) => {
  if (!intentsMap[PROVIDER]) {
    loggerService.info(
      `Skipping custom /googlesheets routes, no intent found for provider ${PROVIDER}`,
    );
    return;
  }
  app.use('/', router);
};
