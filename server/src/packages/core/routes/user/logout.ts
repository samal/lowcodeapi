import express, { Request, Response, Router } from 'express';
import { loggerService } from '../../../../utilities';

import config from '../../../../config';

const { PROTOCOL, APP_DOMAIN, UI_DOMAIN } = config;

const U_D = UI_DOMAIN || APP_DOMAIN;

const redirect: string = `${PROTOCOL}://${U_D}`;

const router: Router = express.Router();

router.get('/logout', async (req: Request, res: Response) => {
  const { user } = req.session;
  loggerService.info(user);
  if (user) {
    delete req.session.user;
  }
  res.json({
    res: {
      redirect,
    },
  });
});

export default router;
