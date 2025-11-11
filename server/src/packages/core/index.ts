import { Application, Request, Response } from 'express';

import { loggerService } from '../../utilities';
import config from '../../config';
import boot from './boot';

import loadDashboardModule from './routes/dashboard';
import loadUnifiedSettings from './routes/unified_settings';

const {
  MOUNT_POINT,
  APP_DOMAIN,
  PROTOCOL,
  UI_DOMAIN = process.env.UI_DOMAIN,
} = config;

let redirectUrl : string | null = null;
const HTTP_PROTOCOL = ['http', 'https'];
if (PROTOCOL && HTTP_PROTOCOL.includes(PROTOCOL) && UI_DOMAIN && APP_DOMAIN) {
  redirectUrl = `${PROTOCOL}://${UI_DOMAIN || APP_DOMAIN}`;
}

export default (app: Application) : void => {
  boot(app);

  loadDashboardModule(app, { MOUNT_POINT });
  loadUnifiedSettings(app, { MOUNT_POINT });

  app.get('/', (req: Request, res: Response) => {
    if (redirectUrl) {
      res.redirect(redirectUrl);
    } else {
      res.json({
        message: 'LowCodeAPI',
      });
    }
  });
  loggerService.info('Core initialized.');
};
