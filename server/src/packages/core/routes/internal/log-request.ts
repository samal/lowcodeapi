import express, { Request, Response, Router } from 'express';
import { uuidv7 } from 'uuidv7';

import config from '../../../../config';
import { safePromise } from '../../../../utilities';
import intents, { providerList } from '../../../../intents';

import { prisma } from '../../db/prisma';
import { logRequestSnakeCaseToCamelCase } from '../../db/prisma/converters';

const router: Router = express.Router();

router.get('/:m1gonaon/log-request', async (req: Request, res: Response) => {
  res.json({ ok: 1 });
});

router.post('/:m1gonaon/log-request', async (req: Request, res: Response) => {
  const { m1gonaon } = req.params;
  const { body } = req;

  if (!config.INTERNAL_ACCESS_KEYS || !config.INTERNAL_ACCESS_KEYS.includes(m1gonaon)) {
    return res.status(403).json({
      message: "You don't have rights to access this API.",
    });
  }
  res.json({ ok: 1 });

  const payload: any = {
    ref_id: uuidv7(),
    user_ref_id: body.user_ref_id,
    service_type: body.service_type || 'direct',
    provider: body.provider,
    via_provider: body.via_provider || body.provider,
    status_code: body.status_code,
    method: body.method,
    intent: body.intent,
    path: body.path,
    api_endpoint: body.api_endpoint || `CUSTOM:${body.path}`,
    payload: {
      body: body.body || null,
      query_params: {
        ...body.query,
        api_token: undefined,
      },
      path_params: body.params || body.query.params,
    },
    response: body.response || {},
    error: body.error,
    client_ip: body.client_request_headers['x-real-ip'] || 'local',
    client_headers: body.client_request_headers,
    response_headers: body.provider_response_headers || {},
    started_at: body.started_at,
    completed_at: body.completed_at,
    trace: { ...body, query: { ...body.query, api_token: undefined } },
  };

  const prismaPayload = logRequestSnakeCaseToCamelCase(payload);
  const [queryError] = await safePromise(
    prisma.log_request.create({
      data: prismaPayload,
    }),
  );

  if (queryError) {
    console.log(payload, queryError, body.path);
  }
});

router.get('/:m1gonaon/providers-seed', async (req: Request, res: Response) => {
  const list = providerList.map((item: any) => {
    const temp = {
      ...item,
      ref_id: item.id,
      id: undefined,
      collection: undefined,
      category: undefined,
      alias_endpoint: undefined,
      brand_assets: undefined,
      og_title: undefined,
      og_tagline: undefined,
      col_width: undefined,
      brand_color: undefined,
      brand_bg_color: undefined,
      brand_text_color: undefined,
      featured: undefined,
      scope: undefined,
      sponsored: undefined,
      href: undefined,
      display_order: undefined,
      api_ref_link: undefined,
      logo: undefined,
      released: item.released,
      '': undefined,
      alias: undefined,
      auth_config: item.auth_config && item.auth_config.length ? [...item.auth_config] : {
        ...item.auth_config,
        scope: item.scope || undefined,
      },
      logo_url: `/images/providers/logos/${item.alias || item.id}.svg`,
    };

    return [temp.ref_id, temp.name || '', temp.description || '', temp.logo_url || '', temp.auth_type || '', JSON.stringify(temp.auth_config), temp.status || null, temp.released || 0, temp.active || 0, temp.website || '', temp.credential_link || '', temp.endpoint || '', temp.total_api || 0];
  });

  if (list.length) {
    try {
      list.forEach(async (item : any) => {
        const placeholders = new Array(item.length).fill('?').join(',');
        console.log(item);
        const query = `INSERT INTO providers (ref_id, name, description, logo_url, auth_type, auth_config, status, released, active, website, credential_link, endpoint, total_api) values (${placeholders})`;
        await prisma.$executeRawUnsafe(query, ...item);
      });
    } catch (e) {
      console.log(e);
    }
  }

  res.json(list);
});

router.get('/:m1gonaon/intents-seed', async (req: Request, res: Response) => {
  const { query } : any = req;
  const providers = (query.selected || '').trim().split(',');
  const list = Object.keys(intents)
    .map((item: any) => item).filter((a) => providers.includes(a.toLowerCase()));

  async function seed(intent: string) {
    const { routes } = intents[intent];
    if (!routes) {
      if (list.length) {
        await seed(list.pop());
      }
      return;
    }
    try {
      const keys = Object.keys(routes);
      // Fixed security issue: use parameterized query instead of string interpolation
      const deleteQuery = 'DELETE FROM providers_intents WHERE provider_id=?';
      await prisma.$executeRawUnsafe(deleteQuery, intent);
      const promise = Promise.all([...keys.map(async (key : any) => {
        const temp = [
          key,
          intent,
          routes[key].text || '',
          routes[key].provider_alias_intent || '',
          routes[key].provider_alias_intent || '',
          routes[key].category || '',
          routes[key].type || '',
          routes[key].request_type || routes[key].type || '',
          routes[key].method || '',
          JSON.stringify(routes[key].params) || '{}',
          JSON.stringify(routes[key].path) || '{}',
          JSON.stringify(routes[key].body) || '{}',
          JSON.stringify(routes[key].custom_headers) || '{}',
          JSON.stringify(routes[key].domain_params) || '{}',
          JSON.stringify(routes[key].meta) || '{}',
          JSON.stringify(routes[key].auth) || '{}',
          JSON.stringify(routes[key].response_format) || '{}',
          routes[key].wip ? 'WIP' : '',
          routes[key].wip || 0,
        ];
        const placeholders = new Array(temp.length).fill('?').join(',');
        const insertQuery = `INSERT INTO providers_intents (ref_id, provider_id, text, provider_alias_intent, category, type, request_type, method, query_params, path_params, body, custom_headers,domain_params, meta, auth, response_format, status, active) values (${placeholders})`;
        await prisma.$executeRawUnsafe(insertQuery, ...temp);
      })]);

      await promise;
      if (list.length) {
        await seed(list.pop());
      }
    } catch (e) {
      console.log(e);
    }
  }

  if (list.length) {
    await seed(list.pop());
  }

  res.json({
    status: 'Added in database intent',
    providers,
  });
});

export default router;
