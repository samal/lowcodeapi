import { Request, Response } from 'express';

import openAPIConverter from './fn/openapi-converter';
import intents from '../intents';

const handler = async (req: Request, res: Response) => {
  const {
    v, type, category, paths: urlPath, keys,
  } = req.query;

  const requestedPaths: { [key: string]: any } = {};
  if (req.method.toUpperCase() === 'POST' && req.body.intents) {
    const { intents } = req.body;
    intents.forEach((intent: any) => {
      requestedPaths[`${intent.path}-${intent.method}`.trim().toLowerCase()] = 1;
    });
  }
  const { provider } = req.params;
  let routesMaps = null;
  if (intents[provider]) {
    routesMaps = intents[provider];
  }

  if (!routesMaps) {
    return res.status(422).json({
      message: 'Invalid request for OpenAPI specs',
    });
  }

  const filters = {
    v, type, category, urlPath, keys, requestedPaths,
  };

  const { routes, config = {}, app = {} } = routesMaps;
  const openApiJSON = openAPIConverter({
    routes, app, filters, config,
  });

  res.json({
    ...openApiJSON,
  });
};

export default handler;
