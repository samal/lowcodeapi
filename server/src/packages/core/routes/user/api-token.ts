import express, { Request, Response, Router } from 'express';
import { safePromise, loggerService } from '../../../../utilities';

import Middlewares from '../../middlewares';

import random from '../../common/generate';

import {
  tokenService,
  userService,
  findUser,
} from '../../services/user';

interface Session {
  user: {
    id: any,
    [key: string]: any
  };
}

const { generateApiToken } = random;
const { isAuthorized } = Middlewares;

const router: Router = express.Router();

router.get('/api-keys', isAuthorized, async (req: Request, res: Response) => {
  const { user } = req.session as Session;
  if (!user) {
    return res.status(401).json({
      message: 'Unauthorized request',
      res: null,
    });
  }

  const { ref_id }: { [key: string]: any } = user;

  const [uerror, userData] = await safePromise(findUser({ key: 'ref_id', value: ref_id }));
  if (uerror) {
    loggerService.error(uerror);
    return res.status(500).json({
      message: 'Error reading user',
    });
  }

  const [error, data] = await safePromise(tokenService.getAllByUserId(userData.ref_id));

  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error in reading api tokens',
    });
  }

  res.json({
    message: 'API tokens',
    res: data,
  });
});

router.post('/api-keys', isAuthorized, async (req: Request, res: Response) => {
  const { user } = req.session;
  if (!user) {
    return res.status(401).json({
      message: 'Unauthorized request',
      res: null,
    });
  }
  const { ref_id }: { [key: string]: any } = user;

  const [uerror, userData] = await safePromise(findUser({ key: 'ref_id', value: ref_id }));
  if (uerror) {
    loggerService.error(uerror);
    return res.status(500).json({
      message: 'Error reading user',
    });
  }
  let api_token;
  // NOTE: check the user data object (from where we get suffix)
  if (userData.extra && userData.extra.suffix) {
    api_token = generateApiToken('r', 'at', userData.extra.suffix);
  } else {
    api_token = generateApiToken('r', 'at');
  }

  const payload = {
    user_ref_id: userData.ref_id,
    api_token,
    active: true,
  };
  const [error, data] = await safePromise(tokenService.add(payload));

  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error in creating new token',
    });
  }

  res.json({
    message: 'New API token generated',
    res: data,
  });
});

router.delete('/api-keys', isAuthorized, async (req: Request, res: Response) => {
  const { user } = req.session;
  if (!user) {
    return res.status(401).json({
      message: 'Unauthorized request',
      res: null,
    });
  }
  const { ref_id }: { [key: string]: any } = user;

  const [uerror, userData] = await safePromise(findUser({ key: 'ref_id', value: ref_id }));
  if (uerror) {
    loggerService.error(uerror);
    return res.status(500).json({
      message: 'Error reading user',
    });
  }

  const { body } = req;
  const payload = {
    ref_id: body.ref_id,
    user_ref_id: userData.ref_id,
    active: true,
  };
  const [error, data] = await safePromise(tokenService.deactivateToken(payload));

  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error in creating new token',
    });
  }

  res.json({
    message: 'Deactivated',
    res: data,
  });
});

router.post('/token/generate', isAuthorized, async (req: Request, res: Response) => {
  const { user } = req.session;
  if (!user) {
    return res.status(401).json({
      message: 'Unauthorized request',
      res: null,
    });
  }
  const { ref_id }: { [key: string]: any } = user;

  const [uerror, userData] = await safePromise(findUser({ key: 'ref_id', value: ref_id }));
  if (uerror) {
    loggerService.error(uerror);
    return res.status(500).json({
      message: 'Internal Server Error',
    });
  }

  // Decide user type;
  const payload = {
    api_token: generateApiToken(),
  };
  const [uError] = await safePromise(userService.update(payload, { ref_id: userData.ref_id }));

  if (uError) {
    return res.status(500).json({
      message: 'Error in generating new api token',
    });
  }

  res.status(200).json({
    message: 'api_token regenerated',
  });
});

export default router;
