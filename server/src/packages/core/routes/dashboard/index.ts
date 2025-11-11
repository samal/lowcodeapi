import { Application } from 'express';

import loadProvidersModule from './providers';

import loadAppConfigRoutes from './app-config';
import loadUser from '../user';

export default (app: Application, { MOUNT_POINT = '/' }) => {
  loadAppConfigRoutes(app, { MOUNT_POINT });
  loadProvidersModule(app, { MOUNT_POINT });
  loadUser(app, { MOUNT_POINT });
};
