import { Application } from 'express';
import userState from './user-state';
import logout from './logout';
import apiToken from './api-token';
import loginIntent from './login-intent';

export default (app: Application, { MOUNT_POINT = '/' }) => {
  app.use(`${MOUNT_POINT}/app`, userState);
  app.use('/account', loginIntent);

  app.use('/account', apiToken);
  app.use(`${MOUNT_POINT}/account`, apiToken);

  app.use(`${MOUNT_POINT}/account`, logout);
  app.use('/account', logout);
};
