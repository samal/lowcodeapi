import {
  Application, Request, Response,
} from 'express';

import providerApis from './routes';

export default (app: Application) : void => {
  app.use('/', providerApis);

  app.get('/', async (req: Request, res: Response) => {
    res.json({
      res: {
        message: 'LowCodeAPI',
      },
    });
  });
  // Health check
  app.get('/health-check', async (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });
};
