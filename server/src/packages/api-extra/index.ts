import {
  Application, Request, Response,
} from 'express';

import { loggerService } from '../../utilities';

import googledocs from './routes/custom/googledocs';
import googlesheets from './routes/custom/googlesheets';

const message = 'LowCodeAPI';
const infoMessage = 'Provider\'s simplified apis implementations are now initialized and ready to access request.';
export default (app: Application) : void => {
  googledocs(app);
  googlesheets(app);
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
