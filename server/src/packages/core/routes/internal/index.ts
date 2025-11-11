import { Application } from 'express';
import logRequest from './log-request';

export default (app: Application) => {
  app.use('/internal', logRequest);
};
