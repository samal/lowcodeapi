import express, { Request, Response, Router } from 'express';

import { loggerService, safePromise } from '../../../../../utilities';
import Middlewares from '../../../middlewares';

import {
  intentRequest,
} from '../../../services/providers';

const { isAuthorized } = Middlewares;

const router: Router = express.Router();

router.get('/metrics', isAuthorized, async (req: Request, res: Response) => {
  // const { filter = 1 } = req.query;
  const { provider = '', method = '', intent = '' } = req.query;
  const { user } = req.session;
  if (!provider) {
    return res.status(422).json({
      message: 'Provider is required',
    });
  }
  const [error, data] = await safePromise(intentRequest({
    user, provider, method, intent,
  }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error getting API metrics',
    });
  }

  res.json({
    message: 'API metrics',
    results: {
      data,
    },
  });
});

export default router;
