import { safePromise, loggerService } from '../../../../../utilities';
import { prisma } from '../../../db/prisma';
import {
  usersProvidersSavedIntentSnakeCaseToCamelCase,
  usersProvidersIntentHydrationSnakeCaseToCamelCase,
  providersIntentDefaultPayloadsSnakeCaseToCamelCase,
} from '../../../db/prisma/converters';
import providers, { providerMap } from '../../../../../intents';
import openapi from '../../../../openapi/fn/openapi-converter';
import requestLogs from '../request-logs';

const USERS_ALLOWED_SAVE_MODE = ['fav', 'pin'];

const get = async ({
  user, mode = '', intent, method, provider = '',
}: {[key:string]: any}) => {
  if (!USERS_ALLOWED_SAVE_MODE.includes(mode.toLowerCase())) throw new Error('Wrong mode');
  
  const query = 'SELECT * FROM users_providers_saved_intents WHERE user_ref_id=? AND saved_mode=? AND method=? AND provider=? AND intent=? LIMIT 1';
  const [error, data] = await safePromise(
    prisma.$queryRawUnsafe(query, user.ref_id, mode, method, provider, intent)
  );
  if (error) {
    throw error;
  }

  const result = data.length ? data[0] : null;
  if (!result) return null;
  return { intent: result.intent };
};

const list = async ({ user, mode = '', provider = '' }: {[key:string]: any}) => {
  if (!USERS_ALLOWED_SAVE_MODE.includes(mode.toLowerCase())) throw new Error('Wrong mode');
  
  const query = 'SELECT * FROM users_providers_saved_intents WHERE user_ref_id=? AND saved_mode=? AND provider=?';
  const [error, data] = await safePromise(
    prisma.$queryRawUnsafe(query, user.ref_id, mode, provider)
  );
  if (error) {
    throw error;
  }
  const providerSelected = providers[provider.toLowerCase()];
  const result = data.map((item: any) => {
    const intentSelect = providerSelected ? providerSelected[item.intent] : {};
    return intentSelect;
  });
  return result;
};

const listFeaturedIntent = async ({ mode = '' }: {[key:string]: any}) => {
  const query = 'SELECT * FROM providers_intents_featured ORDER BY weight DESC LIMIT 50';
  const [error, data] = await safePromise(
    prisma.$queryRawUnsafe(query)
  );
  if (error) {
    throw error;
  }
  const providersMaps : {[key:string]: any} = {};

  data.forEach((item: any) => {
    const provider = item.provider.toLowerCase();
    if (!providersMaps[provider]) {
      providersMaps[provider] = {
        app: {
          ...providerMap[provider],
          [mode]: !!mode,
        },
        routes: {},
      };
    }
    const key = `${item.provider.toLowerCase()}${item.intent.replaceAll('/', '__')}___${item.method.toLowerCase()}`;
    const providerSelected = providers[item.provider.toLowerCase()];
    const intentSelect = (providerSelected
      && providerSelected.routes
      && providerSelected.routes[key]) ? providerSelected.routes[key] : null;

    if (intentSelect) {
      intentSelect[mode] = !!mode;
      providersMaps[provider].routes[key] = intentSelect;
    }
  });

  Object.keys(providersMaps).forEach((provider) => {
    const intentObj = providersMaps[provider];
    const openApiJSON = openapi({ routes: intentObj.routes, app: intentObj.app });
    providersMaps[provider].openapi = openApiJSON;
    providersMaps[provider].routes = undefined;
  });
  return providersMaps;
};

const usersAllIntentList = async ({ user, mode = '' }: {[key:string]: any}) => {
  if (!USERS_ALLOWED_SAVE_MODE.includes(mode.toLowerCase())) throw new Error('Wrong mode');
  
  const query = 'SELECT * FROM users_providers_saved_intents WHERE user_ref_id=? AND saved_mode=?';
  const [error, data] = await safePromise(
    prisma.$queryRawUnsafe(query, user.ref_id, mode)
  );
  if (error) {
    throw error;
  }

  const providersMaps : {[key:string]: any} = {};

  data.forEach((item: any) => {
    const provider = item.provider.toLowerCase();
    if (!providersMaps[provider]) {
      providersMaps[provider] = {
        app: providerMap[provider],
        routes: {},
      };
    }
    const key = `${item.provider.toLowerCase()}${item.intent.replaceAll('/', '__')}___${item.method.toLowerCase()}`;
    const providerSelected = providers[item.provider.toLowerCase()];
    const intentSelect = (providerSelected
      && providerSelected.routes
      && providerSelected.routes[key]) ? providerSelected.routes[key] : null;
    if (intentSelect) {
      providersMaps[provider].routes[key] = intentSelect;
    }
  });

  Object.keys(providersMaps).forEach((provider) => {
    const intentObj = providersMaps[provider];
    const openApiJSON = openapi({ routes: intentObj.routes, app: intentObj.app });
    providersMaps[provider].openapi = openApiJSON;
    providersMaps[provider].routes = undefined;
  });
  return providersMaps;
};

const save = async ({
  user, mode = '', intent, method, provider = '',
}: {[key:string]: any}) => {
  if (!USERS_ALLOWED_SAVE_MODE.includes(mode.toLowerCase())) throw new Error('Wrong mode');
  const payload : any = {
    user_ref_id: user.ref_id,
    saved_mode: mode,
    method,
    provider,
    intent,
    path: intent,
  };

  const prismaPayload = usersProvidersSavedIntentSnakeCaseToCamelCase(payload);
  const [error] = await safePromise(
    prisma.users_providers_saved_intents.create({
      data: prismaPayload,
    }),
  );
  if (error) {
    throw error;
  }

  const providerSelected = providers[provider.toLowerCase()];
  const intentSelect = providerSelected ? providerSelected[intent] : {};
  return intentSelect;
};

const remove = async ({
  user, mode = '', provider, method, intent,
}: {[key:string]: any}) => {
  const query = 'DELETE FROM users_providers_saved_intents WHERE user_ref_id=? AND saved_mode=? AND method=? AND provider=? AND intent=?';
  const [error] = await safePromise(
    prisma.$executeRawUnsafe(query, user.ref_id, mode, method, provider, intent)
  );
  if (error) {
    throw error;
  }

  return null;
};

const hydrate = async ({
  user, intent, method, provider = '',
}: {[key:string]: any}) => {
  const query = 'SELECT * FROM users_providers_intent_hydration WHERE user_ref_id=? AND method=? AND provider=? AND intent=?';
  const [error, data] = await safePromise(
    prisma.$queryRawUnsafe(query, user.ref_id, method, provider, intent)
  );
  if (error) {
    throw error;
  }

  const result = data.map((item : any) => ({
    body: item.body,
    query_params: item.query_params,
    path_params: item.path_params,
    headers: item.headers,
    name: item.name || '',
  }));

  const [logsError, requestHistory] = await safePromise(requestLogs({
    method, provider, path: intent, user, type: '', column: ['payload as request_payload'].join(', '),
  }));

  if (logsError) {
    loggerService.error(logsError);
  }

  const payload_history: Array<any> = [];
  if (requestHistory && requestHistory.length) {
    requestHistory.forEach((request: any) => {
      const { request_payload } = request;
      const hydrate_history : any = {};
      if (request_payload.body) {
        hydrate_history.body = request_payload.body;
      }
      if (request_payload.params) {
        hydrate_history.path_params = request_payload.params;
      }
      if (request_payload.headers) {
        hydrate_history.headers = request_payload.headers;
      }
      if (request_payload.query_params) {
        hydrate_history.query_params = request_payload.query_params;
      }
      hydrate_history.date = request_payload.completed_at;
      hydrate_history.name = request_payload.name || '';
      payload_history.push(hydrate_history);
    });
  }
  return {
    intent,
    method,
    provider,
    hydrate_from: {
      payload_saved: result,
      payload_history,
      payload_examples: [],
    },
  };
};

const storePayload = async ({
  user, intent, method, provider = '', payload,
}: {[key:string]: any}) => {
  const savePayload : any = {
    user_ref_id: user.ref_id,
    method,
    provider,
    intent,
    name: payload.name || '',
    body: payload.body,
    query_params: payload.query_params,
    path_params: payload.path_params,
    headers: payload.headers,
  };

  const prismaPayload = usersProvidersIntentHydrationSnakeCaseToCamelCase(savePayload);
  const [error, data] = await safePromise(
    prisma.users_providers_intent_hydration.create({
      data: prismaPayload,
    }),
  );
  if (error) {
    throw error;
  }

  return data;
};

const hydrateDefault = async ({
  user, intent, method, provider = '',
}: {[key:string]: any}) => {
  const query = 'SELECT * FROM providers_intent_default_payloads WHERE method=? AND provider=? AND intent=?';
  const [error] = await safePromise(
    prisma.$queryRawUnsafe(query, method, provider, intent)
  );
  if (error) {
    throw error;
  }

  // const result = data.map((item : any) => ({
  //   body: item.body,
  //   query_params: item.query_params,
  //   path_params: item.path_params,
  //   headers: item.headers,
  //   name: item.name || '',
  // }));

  const [logsError, requestHistory] = await safePromise(requestLogs({
    method, provider, path: intent, user, type: '', column: ['payload as request_payload'].join(', '),
  }));

  if (logsError) {
    loggerService.error(logsError);
  }

  const payload_examples: Array<any> = [];
  if (requestHistory && requestHistory.length) {
    requestHistory.forEach((request: any) => {
      const { request_payload } = request;
      const hydrate_history : any = {};
      if (request_payload.body) {
        hydrate_history.body = request_payload.body;
      }
      if (request_payload.params) {
        hydrate_history.path_params = request_payload.params;
      }
      if (request_payload.headers) {
        hydrate_history.headers = request_payload.headers;
      }
      if (request_payload.query_params) {
        hydrate_history.query_params = request_payload.query_params;
      }
      hydrate_history.date = request_payload.completed_at;
      hydrate_history.name = request_payload.name || '';
      payload_examples.push(hydrate_history);
    });
  }
  return payload_examples;
};

const storeDefaultPayload = async ({
  user, intent, method, provider = '', payload,
}: {[key:string]: any}) => {
  const savePayload : any = {
    user_ref_id: user.ref_id,
    method,
    provider,
    intent,
    name: payload.name || '',
    body: payload.body,
    query_params: payload.query_params,
    path_params: payload.path_params,
    headers: payload.headers,
  };

  const prismaPayload = providersIntentDefaultPayloadsSnakeCaseToCamelCase(savePayload);
  const [errorD, data] = await safePromise(
    prisma.providers_intent_default_payloads.create({
      data: prismaPayload,
    }),
  );
  if (errorD) {
    throw errorD;
  }

  return data;
};
const fn = {
  get,
  save,
  list,
  listFeaturedIntent,
  remove,
  usersAllIntentList,
  hydrate,
  storePayload,
  hydrateDefault,
  storeDefaultPayload,
};

export default fn;
