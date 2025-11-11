import {
  Application, Request, Response,
} from 'express';

import { loggerService } from '../../utilities';

import {
  // redirect,
  googlesheets,
  googledocs,
  // notion,
  // airtable,
  // twitter,
} from './routes';

const message = 'LowCodeAPI';
const infoMessage = 'Provider\'s simplified apis implementations are now initialized and ready to access request.';
const mount = '/';
export default (app: Application) : void => {
  // app.use('/', redirect);
  app.use('/', googlesheets);
  app.use('/', googledocs);
  // app.use('/', twitter);
  // app.use('/', airtable);
  // app.use('/', notion);

  app.get(mount, async (req: Request, res: Response) => {
    res.json({
      res: {
        message,
      },
    });
  });
  app.get('/', async (req: Request, res: Response) => {
    res.json({
      res: {
        message,
      },
    });
  });
  // Health check
  app.get('/health-check', async (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });
  loggerService.info(infoMessage);
};
