import express, { Request, Response, Router } from 'express';

import { loggerService, safePromise } from '../../../../../utilities';
import Middlewares from '../../../middlewares';

import {
  findUser,
} from '../../../services/user';

import {
  intentAction,
} from '../../../services/providers';

const { isAuthorized } = Middlewares;

const router: Router = express.Router();

router.get('/intent', isAuthorized, async (req: Request, res: Response) => {
  const {
    mode = 'fav', provider = '', intent, method,
  } = req.query;
  const { user } = req.session;
  const [error, data] = await safePromise(intentAction.get({
    user, mode, provider, intent, method,
  }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error getting intent',
    });
  }

  res.json({
    message: 'Get',
    results: data ? { ...data } : null,
  });
});

router.get('/intent-providers-list', isAuthorized, async (req: Request, res: Response) => {
  const { mode = 'fav', provider = '' } = req.query;
  const { user } = req.session;
  const [error, data] = await safePromise(intentAction.list({ user, mode, provider }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error getting intent',
    });
  }

  res.json({
    message: 'List',
    results: {
      data,
    },
  });
});

router.get('/intent/sponsors', async (req: Request, res: Response) => {
  const { mode = 'sponsors' } = req.query;
  const [error, data] = await safePromise(intentAction.listFeaturedIntent({ mode }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error getting intent',
    });
  }

  res.json({
    message: 'Sponsors List',
    results: {
      data,
    },
  });
});

router.get('/intent/featured', async (req: Request, res: Response) => {
  const [error, data] = await safePromise(intentAction.listFeaturedIntent({ mode: 'featured' }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error getting intent',
    });
  }

  res.json({
    message: 'Featured Providers and APIs',
    results: {
      data,
    },
  });
});

router.get('/intent-users-list', isAuthorized, async (req: Request, res: Response) => {
  const { mode = 'fav' } = req.query;
  const { user } = req.session;
  const [error, data] = await safePromise(intentAction.usersAllIntentList({ user, mode }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error getting intent',
    });
  }

  res.json({
    message: 'List',
    results: {
      data,
    },
  });
});

router.post('/intent', isAuthorized, async (req: Request, res: Response) => {
  const {
    mode = 'fav', intent, method, provider,
  } = req.body;
  const { user } = req.session;
  const [error, data] = await safePromise(intentAction.save({
    user, mode, intent, method, provider,
  }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: error.message || 'Error saving',
    });
  }

  res.json({
    message: 'saved',
    results: {
      data,
    },
  });
});

router.delete('/intent', isAuthorized, async (req: Request, res: Response) => {
  const {
    mode = 'fav', intent, method, provider,
  } = req.query;
  const { user } = req.session;
  const [error] = await safePromise(intentAction.remove({
    user, mode, intent, method, provider,
  }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: error.message || 'Error deleting',
    });
  }

  res.json({
    message: `Removed ${intent} from ${mode}`,
    results: {},
  });
});

router.get('/intent/hydrate', isAuthorized, async (req: Request, res: Response) => {
  const { provider = '', intent, method } = req.query;
  const { user } = req.session;
  const [error, data] = await safePromise(intentAction.hydrate({
    user, provider, intent, method,
  }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error hydrating intent',
    });
  }

  res.json({
    message: 'Payload details for the intent',
    results: data,
  });
});

router.post('/intent/hydrate', isAuthorized, async (req: Request, res: Response) => {
  const {
    name = '', provider = '', intent, method, body = {}, query_params = {}, path_params = {}, headers = {},
  } = req.body;
  const { user } = req.session;
  const [error, data] = await safePromise(intentAction.storePayload({
    user,
    provider,
    intent,
    method,
    payload: {
      name, body, query_params, path_params, headers,
    },
  }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error hydrating intent',
    });
  }

  res.json({
    message: 'Saved payload for future use',
    results: data,
  });
});

router.get('/intent/hydrate/default', isAuthorized, async (req: Request, res: Response) => {
  const { provider = '', intent, method } = req.query;
  const { user } = req.session;
  const [error, data] = await safePromise(intentAction.hydrateDefault({
    user, provider, intent, method,
  }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error hydrating intent',
    });
  }

  res.json({
    message: 'Default payloads of the intent',
    results: data,
  });
});
router.post('/intent/hydrate/default', isAuthorized, async (req: Request, res: Response) => {
  const {
    name = '', provider = '', intent, method, body = {}, query_params = {}, path_params = {}, headers = {},
  } = req.body;
  const { user } : any = req.session;
  const [error, userData] = await safePromise(findUser({ key: 'ref_id', value: user.user_ref_id }));
  if (error) {
    loggerService.error(error);
    throw error;
  }

  if (userData.sanitize_allowed
    && (userData.extra.sanitize_intent_add_allowed
    || userData.extra.sanitize_intent_edit_allowed)) {
    const [errorI, data] = await safePromise(intentAction.storeDefaultPayload({
      user,
      provider,
      intent,
      method,
      payload: {
        name, body, query_params, path_params, headers,
      },
    }));
    if (errorI) {
      loggerService.error(errorI);
      return res.status(500).json({
        message: 'Error saving example payload',
      });
    }

    return res.json({
      message: 'Saved default payload',
      results: data,
    });
  }

  res.status(403).json({
    message: 'Not allowed',
  });
});

export default router;
