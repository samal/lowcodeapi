import axios from 'axios';
import express, { Request, Response, Router } from 'express';
import { loggerService, safePromise } from '../../../../../utilities';
import { providerList, providerMap } from '../../../../../intents';

import Middlewares from '../../../middlewares';
import { prisma, executeRawQuerySafe } from '../../../db';

const { isAuthorized } = Middlewares;

const ASSET_ENDPOINT = process.env.ASSET_ENDPOINT || '/images/providers/logos';
const { TARGET_BUILD_ENDPOINT, API_HEX } : any = process.env;

const router: Router = express.Router();

async function providers({ query } : { [key:string]: any}) {
  // Fixed security issue: use parameterized queries instead of string interpolation
  let sqlQuery = 'SELECT *, (select COUNT(*) from providers_intents where providers.ref_id=providers_intents.provider_id) as total_api FROM providers';
  const replacements: any = [];

  if (query.search_by_name) {
    sqlQuery = `${sqlQuery} WHERE name LIKE ?`;
    replacements.push(`%${query.search_by_name}%`);
  } else if (query.search_by_auth_type) {
    sqlQuery = `${sqlQuery} WHERE auth_type = ?`;
    replacements.push(query.search_by_auth_type);
  }

  sqlQuery = `${sqlQuery} ORDER BY name ASC;`;

  // Using executeRawQuerySafe for multi-database support
  const [error, data] = await executeRawQuerySafe(
    prisma,
    sqlQuery,
    replacements
  );

  if (error) {
    throw error;
  }

  const list : any = data.map((item : any) => ({
    ...item,
    logo_url: `${item.ref_id}.svg`,
    id: item.ref_id,
    ref_id: undefined,
    fields: undefined,
    hidden: undefined,
    business_entity_id: undefined,
    created_at: undefined,
  }));

  return list;
}

async function providersIntents({ provider, release } : { [key:string]: any}) {
  const sqlQuery = 'SELECT * from providers_intents WHERE provider_id=?';

  // Using executeRawQuerySafe for multi-database support
  const [error, data] = await executeRawQuerySafe(
    prisma,
    sqlQuery,
    [provider.toLowerCase().trim()]
  );
  if (error) {
    throw error;
  }

  const intents : [] = data.map((item : any) => ({
    ...item,
    id: !release ? item.ref_id : undefined,
    active: !release ? item.active : undefined,
    status: !release ? item.status : undefined,
    ref_id: undefined,
    fields: undefined,
    hidden: undefined,
    business_entity_id: undefined,
    created_at: undefined,
  }));

  return intents;
}

router.get('/provider-list', async (req: Request, res: Response) => {
  const {
    filter, skip, providers, skip_providers,
  } : { [key:string]: any} = req.query;

  const meta = {};
  let list = [];
  let filterList: Array<string> = [];
  if (filter) {
    filterList = filter.split(',');
  }

  let selectProviders: Array<string> = [];
  if (providers) {
    selectProviders = providers.trim().toLowerCase().split(',');
  }

  if (selectProviders.length) {
    list = providerList.filter((provider: any) => selectProviders.includes(provider.id));
  }

  let ingoreProviders: Array<string> = [];
  if (skip_providers) {
    ingoreProviders = skip_providers.trim().toLowerCase().split(',');
  }

  if (ingoreProviders.length) {
    list = providerList.filter((provider: any) => !ingoreProviders.includes(provider.id));
  }

  if (!list.length) {
    list = providerList;
  }

  list = list.map((item: any) => {
    const local : { [key: string]: any} = {
      alias: item.alias || undefined,
      auth_type: item.access_type,
      name: item.service,
      logo: item.logo,
      disabled: !item.released,
      released: !!item.released,
      visible: !!(+item.visible),
      ...(providerMap[item.id] || {}),
      logo_url: `${ASSET_ENDPOINT}/${item.id}.svg`,
      provider_link: undefined,
      href: undefined,
      rank: undefined,

    };

    const target = local;
    if (filterList.length) {
      filterList.forEach((filter) => {
        if (item[filter]) {
          target[filter] = item[filter];
        }
      });
    }

    if (skip) {
      let skipList: Array<string> = [];
      skipList = skip.split(',');
      skipList.forEach((item) => {
        target[item] = undefined;
      });
    }
    return target;
  });

  loggerService.info(`Provider list, ${list.length} providers returned.`);
  res.json({
    message: 'Provider list',
    total: list.length,
    meta,
    res: list,
  });
});

router.get('/providers/list-all', isAuthorized, async (req: Request, res: Response) => {
  const { query } : any = req;
  const { user } : any = req.session;

  const sqlUQuery = 'SELECT first_name, last_name, email, extra FROM users where ref_id=?';
  // Using executeRawQuerySafe for multi-database support
  const [queryError, queryResult] = await executeRawQuerySafe(
    prisma,
    sqlUQuery,
    [user.ref_id]
  );

  if (queryError) {
    console.log(queryError);
    return res.status(500).json({
      message: 'Error getting details',
    });
  }

  if (!queryResult.length) {
    return res.status(422).json({
      message: 'Not allowed',
    });
  }
  const { extra: userExtra } = queryResult[0];
  if (!userExtra.sanitize_allowed) {
    return res.status(422).json({
      message: 'Not allowed.',
    });
  }

  // Fixed security issue: use parameterized queries instead of string interpolation
  let sqlQuery = 'SELECT *, (select COUNT(*) from providers_intents where providers.ref_id=providers_intents.provider_id) as total_api FROM providers';
  const replacements: any = [];

  if (query.search_by_name) {
    sqlQuery = `${sqlQuery} WHERE name LIKE ?`;
    replacements.push(`%${query.search_by_name}%`);
  } else if (query.search_by_auth_type) {
    sqlQuery = `${sqlQuery} WHERE auth_type = ?`;
    replacements.push(query.search_by_auth_type);
  }

  sqlQuery = `${sqlQuery} ORDER BY name ASC;`;

  // Using executeRawQuerySafe for multi-database support
  const [error, data] = await executeRawQuerySafe(
    prisma,
    sqlQuery,
    replacements
  );

  if (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Eror',
    });
  }

  const list : any = data.map((item : any) => ({
    ...item,
    id: item.ref_id,
    logo_url: `${ASSET_ENDPOINT}/${item.ref_id}.svg`,
    ref_id: undefined,
    fields: undefined,
    hidden: undefined,
    business_entity_id: undefined,
    created_at: undefined,
  }));

  if (query.export) {
    if (userExtra.sanitize_provider_export_allowed) {
      const elist = list.filter((item : any) => item.released && item.total_api)
        .map((item: any) => ({
          ...item,
          status: undefined,
          active: undefined,
          last_edited_by_user_ref_id: undefined,
          last_edited_by_user: undefined,
          released: item.released,
        }));
      return res.json(elist);
    }
    return res.status(422).json({
      message: 'Export Not allowed for you.',
    });
  }
  return res.json({
    res: list,
  });
});

router.post('/providers', isAuthorized, async (req: Request, res: Response) => {
  const { body } : any = req;

  if (!body.provider) {
    return res.status(422).json({
      message: 'Provider is required for intent.',
    });
  }

  const { user } : any = req.session;

  const sqlQuery = 'SELECT first_name, last_name, email, extra FROM users where ref_id=?';
  // Using executeRawQuerySafe for multi-database support
  const [queryError, queryResult] = await executeRawQuerySafe(
    prisma,
    sqlQuery,
    [user.ref_id]
  );

  if (queryError) {
    console.log(queryError);
    return res.status(500).json({
      message: 'Error getting details',
    });
  }

  if (!queryResult.length) {
    return res.status(422).json({
      message: 'Not allowed',
    });
  }
  const { first_name, last_name, extra: userExtra } = queryResult[0];
  if (!userExtra.sanitize_allowed) {
    return res.status(422).json({
      message: 'No allowed.',
    });
  }

  const query = 'SELECT * from providers WHERE ref_id=?';

  // Using executeRawQuerySafe for multi-database support
  const [error, data] = await executeRawQuerySafe(
    prisma,
    query,
    [body.provider.trim().toLowerCase()]
  );

  if (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Eror',
    });
  }

  if (data.length) {
    return res.status(422).json({
      message: 'Provider already exists.',
      res: {},
    });
  }

  const iReplacements: any = [
    body.provider.trim().toLowerCase(),
    body.name,
    body.description,
    body.logo_url || '',
    body.auth_type || '',
    JSON.stringify(body.auth || {}),
    JSON.stringify(body.auth_config || {}),
    JSON.stringify(body.headers || {}),
    body.credential_link || '',
    body.api_endpoint || '',
    body.website || '',
    body.api_link_ref || '',
    user.ref_id,
    `${first_name} ${last_name || ''}`.trim(),
  ];

  const placeholders = Array(iReplacements.length).fill('?').join(',');
  const sqlUQuery = `INSERT INTO providers (ref_id, name, description, logo_url, auth_type, auth, auth_config, headers, credential_link, api_endpoint, website, api_link_ref, last_edited_by_user_ref_id, last_edited_by_user) VALUES (${placeholders});`;

  const [queryError1] = await safePromise(
    prisma.$executeRawUnsafe(sqlUQuery, ...iReplacements)
  );

  if (queryError1) {
    return res.status(500).json({
      message: 'Error updating intent.',
      res: {},
    });
  }

  return res.json({
    res: {},
  });
});

router.put('/providers', isAuthorized, async (req: Request, res: Response) => {
  const { body } : any = req;
  const { user } : any = req.session;

  if (!body.id) {
    return res.status(422).json({
      message: 'Provider id is required.',
    });
  }

  const sqlQuery = 'SELECT first_name, last_name, email, extra FROM users where ref_id=?';
  // Using executeRawQuerySafe for multi-database support
  const [queryError, queryResult] = await executeRawQuerySafe(
    prisma,
    sqlQuery,
    [user.ref_id]
  );

  if (queryError) {
    console.log(queryError);
    return res.status(500).json({
      message: 'Error getting details',
    });
  }

  if (!queryResult.length) {
    return res.status(422).json({
      message: 'Not allowed',
    });
  }
  const { first_name, last_name, extra: userExtra } = queryResult[0];
  if (!userExtra.sanitize_allowed) {
    return res.status(422).json({
      message: 'Not allowed.',
    });
  }

  // Update the intent here
  const ureplacements: any = [
    body.released,
    body.name,
    body.description,
    body.logo_url || '',
    body.auth_type || '',
    JSON.stringify(body.auth || {}),
    JSON.stringify(body.auth_config || {}),
    JSON.stringify(body.headers || {}),
    body.credential_link || '',
    body.api_endpoint || '',
    body.website || '',
    body.api_link_ref || '',
    user.ref_id,
    `${first_name} ${last_name || ''}`.trim(),
    body.id,
  ];
  const sqlUQuery = 'UPDATE providers SET released=?, name=?, description=?, logo_url=?, auth_type=?, auth=?, auth_config=?, headers=?, credential_link=?, api_endpoint=?, website=?, api_link_ref=?, last_edited_by_user_ref_id=?, last_edited_by_user=?  WHERE ref_id=?;';

  const [queryError1] = await safePromise(
    prisma.$executeRawUnsafe(sqlUQuery, ...ureplacements)
  );

  if (queryError1) {
    return res.status(500).json({
      message: 'Error updating intent.',
      res: {},
    });
  }
  return res.json({
    res: {},
  });
});

router.put('/providers/release', isAuthorized, async (req: Request, res: Response) => {
  const { body } : any = req;
  const { user } : any = req.session;

  if (!body.id) {
    return res.status(422).json({
      message: 'Provider id is required.',
    });
  }

  const sqlQuery = 'SELECT first_name, last_name, email, extra FROM users where ref_id=?';
  // Using executeRawQuerySafe for multi-database support
  const [queryError, queryResult] = await executeRawQuerySafe(
    prisma,
    sqlQuery,
    [user.ref_id]
  );

  if (queryError) {
    console.log(queryError);
    return res.status(500).json({
      message: 'Error getting details',
    });
  }

  if (!queryResult.length) {
    return res.status(422).json({
      message: 'Not allowed',
    });
  }
  const { first_name, last_name, extra: userExtra } = queryResult[0];
  if (!userExtra.sanitize_allowed || !userExtra.sanitize_provider_release_allowed) {
    return res.status(422).json({
      message: 'This action is not allowed.',
    });
  }

  // Update the intent here
  const ureplacements: any = [
    !!body.released,
    user.ref_id,
    `${first_name} ${last_name || ''}`.trim(),
    body.id,
  ];
  const sqlUQuery = 'UPDATE providers SET released=?, last_edited_by_user_ref_id=?, last_edited_by_user=? WHERE ref_id=?;';

  const [queryError1] = await safePromise(
    prisma.$executeRawUnsafe(sqlUQuery, ...ureplacements)
  );

  if (queryError1) {
    return res.status(500).json({
      message: 'Error updating provider details.',
      res: {},
    });
  }
  return res.json({
    message: 'Updated successfully',
    res: {},
  });
});

router.get('/providers/intents', isAuthorized, async (req: Request, res: Response) => {
  const { query } : any = req;
  const { user } : any = req.session;

  const sqlUQuery = 'SELECT first_name, last_name, email, extra FROM users where ref_id=?';
  // Using executeRawQuerySafe for multi-database support
  const [queryError, queryResult] = await executeRawQuerySafe(
    prisma,
    sqlUQuery,
    [user.ref_id]
  );

  if (queryError) {
    console.log(queryError);
    return res.status(500).json({
      message: 'Error getting details',
    });
  }

  if (!queryResult.length) {
    return res.status(422).json({
      message: 'Not allowed',
    });
  }
  const { extra: userExtra } = queryResult[0];
  if (!userExtra.sanitize_allowed) {
    return res.status(422).json({
      message: 'Not allowed.',
    });
  }

  if (!query.provider) {
    return res.status(422).json({
      message: 'Provider is required for intent.',
    });
  }
  const sqlQuery = 'SELECT * from providers_intents WHERE provider_id=?';

  // Using executeRawQuerySafe for multi-database support
  const [error, data] = await executeRawQuerySafe(
    prisma,
    sqlQuery,
    [query.provider.toLowerCase().trim()]
  );
  if (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Eror',
    });
  }

  const list : any = data.map((item : any) => ({
    ...item,
    id: !query.export ? item.ref_id : undefined,
    active: !query.export ? item.active : undefined,
    status: !query.export ? item.status : undefined,
    ref_id: undefined,
    fields: undefined,
    hidden: undefined,
    business_entity_id: undefined,
    created_at: undefined,
  }));

  if (query.export) {
    if (userExtra.sanitize_intent_export_allowed) {
      const intents : any = {
        routes: {},
      };
      list.forEach((item: any) => {
        intents.routes[item.provider_intent] = {
          provider_intent: item.provider_intent,
          provider_alias_intent: item.provider_alias_intent,
          provider_proxy_intent: item.provider_proxy_intent || null,
          text: item.text,
          category: item.category,
          method: item.method,
          type: item.type,
          request_type: item.type,
          params: item.query_params,
          path: item.path_params,
          query_params: undefined,
          path_params: undefined,
          body: item.body,
          custom_headers: item.custom_headers,
          domain_params: item.domain_params,
          meta: item.meta,
          auth: item.auth || [],
          response_format: item.response_format,
          updated_at: item.updated_at,
        };
      });
      return res.json(intents);
    }
    return res.status(422).json({
      message: 'Export Not allowed for you.',
    });
  }
  return res.json({
    res: list,
  });
});

router.post('/providers/intents', isAuthorized, async (req: Request, res: Response) => {
  const { body } : any = req;

  if (!body.provider_id) {
    return res.status(422).json({
      message: 'Provider is required for intent.',
    });
  }

  const { user } : any = req.session;

  const sqlQuery = 'SELECT first_name, last_name, email, extra FROM users where ref_id=?';
  // Using executeRawQuerySafe for multi-database support
  const [queryError, queryResult] = await executeRawQuerySafe(
    prisma,
    sqlQuery,
    [user.ref_id]
  );

  if (queryError) {
    console.log(queryError);
    return res.status(500).json({
      message: 'Error getting details',
    });
  }

  if (!queryResult.length) {
    return res.status(422).json({
      message: 'Not allowed',
    });
  }
  const { first_name, last_name, extra: userExtra } = queryResult[0];
  if (!userExtra.sanitize_allowed) {
    return res.status(422).json({
      message: 'No allowed.',
    });
  }

  const iReplacements: any = [
    body.provider_id,
    body.provider_intent,
    body.provider_intent,
    body.provider_alias_intent,
    body.provider_proxy_intent,
    body.text || '',
    body.category || '',
    body.method || '',
    body.type || '',
    body.type || '',
    JSON.stringify(body.query_params),
    JSON.stringify(body.path_params),
    JSON.stringify(body.body),
    JSON.stringify(body.custom_headers),
    JSON.stringify(body.domain_params),
    JSON.stringify(body.meta),
    JSON.stringify(body.response_format),
    user.ref_id,
    `${first_name} ${last_name || ''}`.trim(),
  ];

  const placeholders = Array(iReplacements.length).fill('?').join(',');
  const sqlUQuery = `INSERT INTO providers_intents (provider_id,ref_id, provider_intent, provider_alias_intent, provider_proxy_intent, text, category, method, type, request_type, query_params, path_params, body, custom_headers , domain_params, meta, response_format, last_edited_by_user_ref_id, last_edited_by_user) VALUES (${placeholders});`;

  const [queryError1] = await safePromise(
    prisma.$executeRawUnsafe(sqlUQuery, ...iReplacements)
  );

  if (queryError1) {
    console.log(queryError1);
    return res.status(500).json({
      message: 'Error updating intent.',
      res: {},
    });
  }

  return res.json({
    res: {},
  });
});

router.put('/providers/intents', isAuthorized, async (req: Request, res: Response) => {
  const { body } : any = req;
  const { user } : any = req.session;

  if (!body.provider_id && body.id) {
    return res.status(422).json({
      message: 'Provider intent id is required for intent.',
    });
  }

  const sqlQuery = 'SELECT first_name, last_name, email, extra FROM users where ref_id=?';
  // Using executeRawQuerySafe for multi-database support
  const [queryError, queryResult] = await executeRawQuerySafe(
    prisma,
    sqlQuery,
    [user.ref_id]
  );

  if (queryError) {
    console.log(queryError);
    return res.status(500).json({
      message: 'Error getting details',
    });
  }

  if (!queryResult.length) {
    return res.status(422).json({
      message: 'Not allowed',
    });
  }
  const { first_name, last_name, extra: userExtra } = queryResult[0];
  if (!userExtra.sanitize_allowed) {
    return res.status(422).json({
      message: 'Not allowed.',
    });
  }

  // Update the intent here
  const ureplacements: any = [
    body.text || '',
    body.provider_intent,
    body.provider_alias_intent,
    body.provider_proxy_intent,
    body.category || '',
    body.method || '',
    body.type || '',
    body.type || '',
    JSON.stringify(body.query_params),
    JSON.stringify(body.path_params),
    JSON.stringify(body.body),
    JSON.stringify(body.custom_headers),
    JSON.stringify(body.domain_params),
    JSON.stringify(body.meta),
    JSON.stringify(body.response_format),
    body.status,
    user.ref_id,
    `${first_name} ${last_name || ''}`.trim(),
    body.provider_id,
    body.id,
  ];
  const sqlUQuery = 'UPDATE providers_intents SET text=?, provider_intent=?, provider_alias_intent=?, provider_proxy_intent=?, category=?, method=?, type=?, request_type=?, query_params=?, path_params=?, body=?, custom_headers=? , domain_params=? , meta=?, response_format=?, status=?, last_edited_by_user_ref_id=?, last_edited_by_user=? WHERE provider_id=? AND ref_id=?;';

  const [queryError1] = await safePromise(
    prisma.$executeRawUnsafe(sqlUQuery, ...ureplacements)
  );

  if (queryError1) {
    return res.status(500).json({
      message: 'Error updating intent.',
      res: {},
    });
  }
  return res.json({
    res: {},
  });
});

router.delete('/providers/intents', isAuthorized, async (req: Request, res: Response) => {
  const { body } : any = req;
  const { user } : any = req.session;

  if (!body.provider_id && body.id) {
    return res.status(422).json({
      message: 'Provider intent id is required for intent.',
    });
  }

  const sqlQuery = 'SELECT first_name, last_name, email, extra FROM users where ref_id=?';
  // Using executeRawQuerySafe for multi-database support
  const [queryError, queryResult] = await executeRawQuerySafe(
    prisma,
    sqlQuery,
    [user.ref_id]
  );

  if (queryError) {
    console.log(queryError);
    return res.status(500).json({
      message: 'Error getting details',
    });
  }

  if (!queryResult.length) {
    return res.status(422).json({
      message: 'Not allowed',
    });
  }
  const { extra: userExtra } = queryResult[0];
  if (!userExtra.sanitize_allowed) {
    return res.status(422).json({
      message: 'Not allowed.',
    });
  }

  // Update the intent here
  const ureplacements: any = [
    body.provider_id,
    body.id,
  ];
  const sqlUQuery = 'DELETE FROM providers_intents WHERE provider_id=? AND ref_id=? LIMIT 1;';

  const [queryError1] = await safePromise(
    prisma.$executeRawUnsafe(sqlUQuery, ...ureplacements)
  );

  if (queryError1) {
    return res.status(500).json({
      message: 'Error updating intent.',
      res: {},
    });
  }
  return res.json({
    res: {},
  });
});

router.post('/providers/commit', isAuthorized, async (req: Request, res: Response) => {
  const { query } : any = req;
  const { user } : any = req.session;

  const sqlUQuery = 'SELECT first_name, last_name, email, extra FROM users where ref_id=?';
  // Using executeRawQuerySafe for multi-database support
  const [queryError, queryResult] = await executeRawQuerySafe(
    prisma,
    sqlUQuery,
    [user.ref_id]
  );

  if (queryError) {
    console.log(queryError);
    return res.status(500).json({
      message: 'Error getting details',
    });
  }

  if (!queryResult.length) {
    return res.status(422).json({
      message: 'Not allowed',
    });
  }
  const { extra: userExtra } = queryResult[0];
  if (!userExtra.sanitize_allowed || !userExtra.sanitize_provider_commit_allowed) {
    return res.status(422).json({
      message: 'Action Not allowed.',
    });
  }

  const [error, list] = await safePromise(providers({ query }));

  if (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Error deploying',
    });
  }

  const providersList: [] = list.filter((item : any) => item.released && item.total_api)
    .map((item: any) => ({
      ...item,
      status: undefined,
      active: undefined,
      last_edited_by_user_ref_id: undefined,
      last_edited_by_user: undefined,
      released: item.released,
    }));

  let intents : any = null;
  const provider = query.provider && query.provider.trim().toLowerCase();
  if (provider) {
    const found = providersList.find((item: any) => item.id === provider);

    if (found) {
      const [error, list] = await safePromise(providersIntents({
        provider: query.provider.toLowerCase().trim(), release: true,
      }));

      if (error) {
        console.log(error);
        return res.status(500).json({
          message: 'Error deploying',
        });
      }
      const intentsMap : any = {
        routes: {},
      };
      list.forEach((item: any) => {
        intentsMap.routes[item.provider_intent] = {
          provider_intent: item.provider_intent,
          provider_alias_intent: item.provider_alias_intent,
          provider_proxy_intent: item.provider_proxy_intent || null,
          text: item.text,
          category: item.category,
          method: item.method,
          type: item.type,
          request_type: item.type,
          params: item.query_params,
          path: item.path_params,
          query_params: undefined,
          path_params: undefined,
          body: item.body,
          custom_headers: item.custom_headers,
          domain_params: item.domain_params,
          meta: item.meta,
          auth: item.auth || [],
          response_format: item.response_format,
          updated_at: item.updated_at,
        };
      });

      if (intentsMap.routes && Object.keys(intentsMap.routes).length) {
        intents = intentsMap;
      }
    }
  }

  // dipatch to deploy instance
  const deployUrl = `${TARGET_BUILD_ENDPOINT}/code/commit/${provider ? 'intent' : 'providers'}?api_hex=${API_HEX}`;

  const body = {
    providers: providersList,
    intents: provider ? intents : undefined,
    name: provider || undefined,
  };

  const [deployError] = await safePromise(axios({
    url: deployUrl,
    method: 'POST',
    data: body,
  }));

  if (deployError) {
    console.log(deployError.response.data);
    return res.status(500).json({
      message: 'Error deploying',
    });
  }
  res.json({
    message: provider ? `Total ${providerList.length} providers and ${provider}'s intent commited to repo.` : `Total ${providerList.length} providers commited to repo.`,
  });
});

export default router;
