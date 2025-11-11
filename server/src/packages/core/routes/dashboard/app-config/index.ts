import { Application } from 'express';
import config from './config';

export default (app: Application, { MOUNT_POINT = '/' }) => {
  app.use(`${MOUNT_POINT}/app`, config);
};
