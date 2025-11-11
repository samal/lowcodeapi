import { Application } from 'express';
import providers from './apis';
import providersList from './provider-list';
import intentMetrics from './intent-metrics';
import intentAction from './intent-action';
import requestLogs from './request-logs';

export default (app: Application, { MOUNT_POINT = '/' }) => {
  app.use(`${MOUNT_POINT}/integrations`, providers);
  app.use(MOUNT_POINT, providersList);
  app.use(MOUNT_POINT, requestLogs);
  app.use(MOUNT_POINT, intentMetrics);
  app.use(MOUNT_POINT, intentAction);
};
