import { loggerService, safePromise } from '../../../utilities';

import generic from '../../../api-dispatch';
import intents from '../../../intents';

async function fetchIntent(
  route: { provider_alias_intent: string | number, text: string },
  keys: { [key: string]: any },
) {
  const {
    provider,
    app,
    query,
    params,
    headers: clientHeaders,
    apiParams = {},
  } = keys;

  const providerConfig : { [key: string]: any } = {};

  apiParams[route.provider_alias_intent].query_params.forEach((param: string | number) => {
    if (query[param]) {
      providerConfig[param] = query[param];
    }
  });

  // let options : {[key: string]: any} = {
  //   app,
  //   authToken: app.authToken,
  //   routeMap: {
  //     ...route,
  //     provider_key: getProviderKey(query),
  //     provider_config: providerConfig,
  //   },
  //   query,
  //   params,
  // };

  let selectedProviderEngine = null;
  let options: any = null;

  if (!selectedProviderEngine && intents[provider]) {
    selectedProviderEngine = generic;
    options = {
      provider,
      target: route,
      payload: {
        query: { ...query, api_token: undefined },
        params: { ...query, ...params, api_token: undefined },
        headers: clientHeaders,
      },
      // authObj: app.authToken,
      credsObj: app.credsObj,
    };
    // loggerService.info(`No custom implementation for ${provider}`);
    // loggerService.info('Using generic HTTP GET rest implementation');
  } else {
    loggerService.info(`Custom implementation exist for ${provider}`);
    loggerService.info(`Using /integrations/${provider}`);
  }
  loggerService.info('selected intent', route.text);

  if (!selectedProviderEngine) {
    const error : { [key: string]: any } = new Error('Unknown provider');
    error.code = 422;
    throw error;
  }

  const [providerError, response] = await safePromise(selectedProviderEngine(options));

  if (providerError) {
    const message = providerError.message || 'Error processing the request';
    const error : { [key: string]: any } = new Error(message);

    if (providerError.headers) {
      error.headers = providerError.headers;
    }

    error.data = providerError.data || providerError.errors || providerError.error;

    error.code = providerError.code || 500;
    throw error;
  }
  const { data, meta = {}, headers } = response;

  return {
    data,
    ...meta,
    headers: (meta && meta.headers) ? meta.headers : (headers || {}),
  };
}

export default fetchIntent;
