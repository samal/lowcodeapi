import express, { Request, Response, Router } from 'express';

import { loggerService, safePromise } from '../../../../../utilities';
import Middlewares from '../../../middlewares';

import {
  requestLogs,
} from '../../../services/providers';

const { isAuthorized } = Middlewares;

const router: Router = express.Router();

router.get('/request-logs', isAuthorized, async (req: Request, res: Response) => {
  // const { filter = 1 } = req.query;
  const {
    lookup = 0, // eslint-disable-line no-unused-vars
    page, // eslint-disable-line no-unused-vars
    method,
    provider,
    path,
    type, skip = 0,
  } = req.query;
  const { user } = req.session;
  const [error, data] = await safePromise(requestLogs({
    skip, provider, method, path, user, type,
  }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error getting logs',
    });
  }

  res.json({
    message: 'Request log',
    results: {
      total: data.length,
      list: data,
    },
  });
});

export default router;
