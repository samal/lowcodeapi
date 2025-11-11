import express, { Request, Response, Router } from 'express';

import { loggerService, safePromise } from '../../../../../utilities';
import Middlewares from '../../../middlewares';
import { providerList as Providers } from '../../../../../intents';

import {
  fetchActivatedProviders,
  fetchActivatedProviderDetail,
  fetchActivatedProviderCredsAndTokens,

  saveProviderCredsAndTokens,
  deleteProviderCredsAndTokens,
} from '../../../services/providers';

const { isAuthorized } = Middlewares;

// const { OAUTH } = config;
const router: Router = express.Router();

router.get('/providers', isAuthorized, async (req: Request, res: Response) => {
  let { filter = 1 } = req.query;
  const { lookup = 0 } = req.query;
  const { user } = req.session;
  const [error, list] = await safePromise(fetchActivatedProviders({ user }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: error.message,
    });
  }
  filter = +filter;
  let final = filter ? list.filter((item: {[key:string]: any}) => item.activated) : list;
  if (lookup) {
    const list = final;
    final = {};
    list.forEach((item: {[key:string]: any}) => {
      final[item.provider_key] = item;
    });
  }
  res.json({
    message: 'Providers List',
    res: final,
  });
});

router.get('/:provider', isAuthorized, async (req: Request, res: Response) => {
  const { check } = req.query;
  const { user }: any = req.session;
  const { provider } : { [key: string]: string } = req.params;
  const providerInfo = Providers.filter((item : any) => item.id === provider);

  if (!providerInfo.length) {
    return res.json({
      message: `Provider ${provider} is not implemented yet`,
    });
  }
  const [error, data] = await safePromise(fetchActivatedProviderDetail({ user, provider }));
  if (error) {
    loggerService.error(error);
    return res.status(error.code || 500).json({
      message: error.message,
    });
  }

  const { auth_config, auth_type, scope } = providerInfo[0];
  const resp = {
    ...data,
    credentials: undefined,
    category: undefined,
    provider_identifier: undefined,
    hidden: undefined,
    presets: undefined,
    id: undefined,
    provider_ref_id: undefined,
    provider_key: undefined,
    active: undefined,
    auth_config,
    auth_type,
  };

  const oAuth = ['OAUTH2.0', 'OAUTH1.0', 'OAUTH1.0a'].includes(resp.auth_type);

  if (check) {
    resp.scope = scope;
    const [error1, data1] = await safePromise(fetchActivatedProviderCredsAndTokens(user, provider, ''));
    if (error1) {
      loggerService.info(error1);
      return res.status(error1.code || 500).json({
        message: error1.message,
      });
    }
    if (data1 && data1.length) {
      const result = data1[0];
      if (result.config && Object.keys(result.config).length) {
        resp.activated = true;
        if (!oAuth && result.config.masked) {
          resp[provider] = { ...result.config.masked };
          resp.credential_found = true;
        } else if (oAuth && result.config.encrypted) {
          console.log(oAuth, result.config.encrypted);
          resp.authorized = true;
        }
      }

      if (result.credentials && Object.keys(result.credentials).length) {
        resp.credential_found = true;
        resp[provider] = {
          ...result.credentials.masked,
          selected_scopes: result.credentials.selected_scopes,
        };
      }
    }
    // if (oAuth && !resp.credential_found) {
    //   const system_fallback = OAUTH[provider.toUpperCase()];
    //   if (system_fallback) {
    //     const { CLIENT_ID, CLIENT_SECRET, API_KEY, API_SECRET } = system_fallback;
    //     if ((CLIENT_ID && CLIENT_SECRET) || (API_KEY && API_SECRET)) {
    //       resp.system_creds = true;
    //     }
    //   }
    // }
  }

  if (resp[provider]) {
    loggerService.info(`${provider} resp`, resp[provider]);
  }
  res.json({
    message: `${provider}`,
    res: resp,
  });
});

router.post('/providers', isAuthorized, async (req: Request, res: Response) => {
  const { user } = req.session;
  const { body } = req;

  if (!body.provider || !body.config || !Object.keys(body.config).length) {
    const message = 'Missings provider or incomplete provider config';
    loggerService.info(message);
    return res.status(422).json({
      message,
    });
  }

  const providerInfo = Providers.filter((item :any) => item.id === body.provider);

  if (!providerInfo.length) {
    return res.json({
      message: `Provider ${body.provider} is not implemented yet`,
    });
  }

  const selected = providerInfo[0];
  const payload = {
    ...body,
    auth_type: selected.auth_type,
  };
  const [error] = await safePromise(saveProviderCredsAndTokens({ body: payload, user }));
  if (error) {
    const message = error.message || 'Error integrating this provider';
    return res.status(500).json({
      message,
    });
  }
  res.json({
    message: 'Integrated the provider',
    res: {},
  });
});

router.delete('/:provider', isAuthorized, async (req: Request, res: Response) => {
  const { user } = req.session;
  const { provider } : { [key: string]: string } = req.params;

  if (!provider) {
    const message = 'Missings provider';
    loggerService.info(message);
    return res.status(422).json({
      message,
    });
  }
  const [error] = await safePromise(deleteProviderCredsAndTokens({ provider, user }));
  if (error) {
    const message = error.message || 'Error Deleting this provider';
    return res.status(500).json({
      message,
    });
  }
  res.json({
    message: 'Credentials deleted',
    res: {},
  });
});

export default router;
