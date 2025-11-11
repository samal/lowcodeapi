import express, { Application } from 'express';

// import plugBuild from './ui-loader';

import fs from 'fs';
import path from 'path';
import session from './session';
import { loggerService } from '../../../utilities';

const plugBuild = (app: Application): void => {
  try {
    const staticBuildPath = process.env.UI_BUILD_PATH || '../../../uidist';
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

export default (app: Application): void => {
  session(app);
  plugBuild(app);
};
