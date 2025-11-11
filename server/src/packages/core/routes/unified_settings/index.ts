import { Application } from 'express';

import settings from './settings';

export default (app: Application, { MOUNT_POINT = '/' }) => {
  app.use(`${MOUNT_POINT}/unified`, settings);
};
