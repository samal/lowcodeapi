import express, { Application } from 'express';
import fs from 'fs';
import path from 'path';
import cors, { CorsOptions } from 'cors';

import { loggerService } from '../utilities';

const plugCors = (app: Application): void => {
  const corsOptions: CorsOptions = {
    credentials: true,
    origin: true,
    allowedHeaders:
          'Accept, Origin, X-Requested-With, x-auth-token, X-Auth-Token, Authorization, Content-Type, content-type, Cache-Control, Access-Control-Allow-Origin',
  };

  app.use(cors(corsOptions));
};

const plugIpLogging = (app: Application): void => {
  app.use((req, res, next) => {
    const { headers } = req;
    const ip = headers['x-forwarded-for'] || headers['x-real-ip'];
    loggerService.info(`Request from IP: ${ip} ${(new Date().toUTCString())}`, req.path);
    next();
  });
};

const plugBuild = (app: Application): void => {
  try {
    const staticBuildPath = process.env.UI_BUILD_PATH || '../../ui';
    // eslint-disable-next-line global-require, import/no-dynamic-require
    app.use(express.static(path.join(__dirname, `${staticBuildPath}`)));
    app.use('/_next', express.static(path.join(__dirname, staticBuildPath)));

    app.get('*', (req, res, next) => {
      const { path: reqPath, query } = req;

      const staticPath = path.resolve(__dirname, staticBuildPath) + `${reqPath}.html`.replace('/.', '.');
      if (query.api_token) return next();
      fs.readFile(staticPath, 'utf8', (err, data) => {
        if (err) {
          return next();
        }
        if (data) {
          return res.send(data);
        }
        return next();
      });
    });
  } catch (e) {
    loggerService.error('Init::UI path failed', e);
  }
};

export default (app: Application, IP_LOGGING: boolean): void => {
  plugCors(app);
  plugBuild(app);
  if (IP_LOGGING) {
    plugIpLogging(app);
  }
};
