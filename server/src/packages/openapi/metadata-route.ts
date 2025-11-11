import { Request, Response } from 'express';

import intents from '../../intents';

import sanitize from './fn/utils-fn';

// Internal build api
const metadata = async (req: Request, res: Response) => {
  const { provider } = req.params;
  let routesMaps = null;
  if (intents[provider]) {
    routesMaps = intents[provider];
  } else {
    // Handle devjson case if needed
  }

  if (!routesMaps) {
    return res.status(422).json({
      message: 'Invalid OpenAPI definition request.',
    });
  }

  const { routes } : { [key: string] : any } = { ...routesMaps };
  const categories: { [key: string]: any} = {};

  const routesArr = Array.isArray(routes) ? routes : Object.keys(routes);

  routesArr.forEach((route) => {
    const intent = typeof route === 'string' ? routes[route] : route;
    const method = intent?.method.toLowerCase();
    if (!method) return;
    if (categories[intent.category]) {
      categories[intent.category].paths.push(intent.provider_alias_intent, `${intent.provider_alias_intent}~${method}`);
    } else {
      const category_id = sanitize(intent.category);

      categories[intent.category] = {
        id: category_id,
        paths: [intent.provider_alias_intent, `${intent.provider_alias_intent}~${method}`],
      };
    }
  });
  res.json({
    message: `API metadata for ${provider}`,
    res: {
      ...categories,
    },
  });
};

export default metadata;
