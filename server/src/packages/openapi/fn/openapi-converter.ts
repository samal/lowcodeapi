import { loggerService } from '../../../utilities';
import sanitize from './utils-fn';

const typeMap : { [key: string]: any} = {
  json: {},
  object: {},
  array: [],
  null: null,
  undefined: '',
  string: '',
  boolean: false,
  number: 0,
};
const versions = ['v1.1', 'v2'];
const types = ['migrate_from', 'migrate_to', 'get', 'post'];
const CODES = {};

export default ({
  app, routes, filters, config,
}: { [key: string]: any }) => {
  const routeArr = Object.keys(routes);

  const {
    v, type, category, urlPath, keys, requestedPaths,
  } = filters || {};
  const pathLookup: { [key: string]: any } = {};

  const categoryMap: { [key: string]: any } = {};
  const version: { [key: string]: any } = {};

  let filterMethod: string;
  let filterUrl: string;

  if (urlPath) {
    const [url, method] = urlPath.split('~');
    filterUrl = url;
    filterMethod = method;
  }

  let detail = true;

  if (keys) {
    detail = false;
  }

  routeArr.forEach((item : string | { [key: string]: any}) => {
    const lookup: { [key: string]: any } = typeof item === 'string' ? routes[item] : item;

    if (v) {
      if (versions.includes(v) && lookup.meta.version !== v) {
        // TODO:
        loggerService.info('Pending version check', v, lookup.meta);
        return;
      }
    }

    if (type) {
      if (!lookup[type] || !types.includes(type)) return;

      if (lookup[type].toUpperCase() !== 'YES') {
        return;
      }
    }

    const method : string = (lookup.method || '').toLowerCase();

    if (requestedPaths && Object.keys(requestedPaths).length) {
      const lookup_intent = `${lookup.provider_alias_intent}___${method}`.trim().toLowerCase();
      if (!requestedPaths[lookup_intent]) {
        console.log(lookup.provider_alias_intent, 'Path Didnt match. return');
        return;
      }
      console.log('match found', requestedPaths[lookup_intent], lookup.provider_alias_intent);
    } else {
      if (filterMethod && method.toLowerCase() !== filterMethod.toLowerCase()) {
        return;
      }

      if (filterUrl) {
        const intent = lookup.provider_alias_intent.replace('/', '').replaceAll('/', '-').toLowerCase();
        if (intent !== filterUrl.toLowerCase()) return;
      }
    }

    if (lookup.category && categoryMap[lookup.category]) {
      categoryMap[lookup.category] += 1;
    } else {
      categoryMap[lookup.category] = 1;
    }

    // Filter category
    if (category && lookup.category && category !== sanitize(lookup.category)) {
      return;
    }

    if (lookup.meta.version && version[lookup.meta.version]) {
      version[lookup.meta.version] += 1;
    } else {
      version[lookup.meta.version] = 1;
    }
    const tags = [].concat(lookup.category);
    let rl_text = '';
    if (Object.keys(lookup.meta.rate_limit).length) {
      const rl_obj = lookup.meta.rate_limit;
      const rlk = Object.keys(rl_obj);

      // eslint-disable-next-line no-unused-vars
      rl_text = '\n';
      rlk.forEach((rlv) => {
        const rl_value = rl_obj[rlv];
        rl_text += `\`${rl_value.request}\` requests every \`${rl_value.minutes}\` minutes for an ${rlv} are permitted.\n`;
      });
    }
    const getObject: { [key: string]: any } = {
      tags,
      parameters: [],
      responses: CODES,
      externalDocs: {
        url: lookup.meta.api_doc,
        api_ref: lookup.meta ? lookup.meta.api_ref : '',
        api_endpoint: lookup.meta.api_endpoint,
      },
      response_type: lookup.response_type || undefined, // this is hack
    };

    // TODO: Handle extra_key if needed
    getObject.summary = '';

    if (lookup.meta.version) {
      getObject.summary += `${lookup.meta.version.toUpperCase()} •`;
    }

    if (lookup.summary || lookup.text) {
      getObject.summary = lookup.summary || lookup.text;
    }
    const description = [
      `${lookup.meta.description ? lookup.meta.description : ''}`,
    ];

    getObject.description = description.join('\n');

    const paramsKeys = Object.keys(lookup.params || {});
    const pathKeys = Object.keys(lookup.path || {});
    // Hide the params for public request
    // if (user && params.length) {

    if (detail && pathKeys.length) {
      pathKeys.forEach((item) => {
        const pathObj = lookup.path[item];
        // http://spec.openapis.org/oas/v3.0.3#operation-object-example
        if (!pathObj || pathObj.disabled) return;

        const fields: { [key: string]: any } = {
          name: item,
          in: 'path',
          description: pathObj.description || pathObj.text,
          required: true,
          schema: {
            type: pathObj.type,
            example: pathObj.example || '',
          },
        };

        if (pathObj.enum) {
          fields.schema.items = {
            type: 'string',
            enum: pathObj.enum,
          };
        }
        getObject.parameters.push(fields);
      });
    }

    if (detail && paramsKeys.length) {
      paramsKeys.forEach((item) => {
        if (pathKeys.includes(item)) return; // skip if already in path

        const paramObj = lookup.params[item];
        // http://spec.openapis.org/oas/v3.0.3#operation-object-example
        if (!paramObj || paramObj.disabled) return;

        const fields: { [key: string]: any } = {
          name: item,
          in: 'query',
          description: paramObj.description || paramObj.text,
          required: paramObj.required,
          schema: {
            type: paramObj.type,
            example: paramObj.example || '',
          },
        };

        if (paramObj.enum) {
          fields.schema.items = {
            type: 'string',
            enum: paramObj.enum,
          };
        }
        getObject.parameters.push(fields);
      });
    }

    getObject.security = [{
      ApiToken: [],
    }];
    getObject.responses[401] = {
      description: 'API token required',
      content: {
        'application/json': {},
      },
    };

    if (detail && ['post', 'patch', 'put', 'delete'].includes(method) && lookup.body) {
      // for file upload
      const isUpload = lookup.type && ['file', 'upload'].includes(lookup.type.toLowerCase());
      const body = Object.keys(lookup.body || {});
      let contentBlock = '';
      if (/media/.test(lookup.provider_alias_intent) || isUpload) {
        contentBlock = 'multipart/form-data';
        getObject.requestBody = {
          description: '',
          required: false,
          content: {
            [contentBlock]: {
              schema: {
                type: 'object',
                required: [],
                properties: {
                },
              },
              example: {
                ...lookup.body,
              },
            },
          },
        };
      } else {
        contentBlock = 'application/json';
        getObject.requestBody = {
          description: '',
          required: true,
          content: {
            [contentBlock]: {
              schema: {
                type: 'object',
                required: [],
                properties: {},
              },
              example: {},
            },
          },
        };
      }
      const examples: { [key: string]: any } = {};
      const properties: { [key: string]: any } = {};
      body.forEach((item) => {
        const type = lookup.body[item] ? lookup.body[item].type : '';
        properties[item] = {
          type: lookup.body[item].type,
          description: lookup.body[item].description || lookup.body[item].text,
        };

        if (lookup.body[item].required) {
          properties[item].required = true;
        }
        if (lookup.body[item].enum) {
          properties[item].enum = lookup.body[item].enum;
        }
        examples[item] = lookup.body[item].examples || typeMap[type] || '';
      });

      // Hide the body for public request
      // if (user) {
      getObject.requestBody.content[contentBlock].schema.properties = properties;

      if (lookup.examples && lookup.examples.body) {
        getObject.requestBody.content[contentBlock].example = lookup.examples.body;
      } else {
        getObject.requestBody.content[contentBlock].example = examples;
      }
    }

    const keyLookup = lookup.provider_alias_intent;
    if (pathLookup[keyLookup]) {
      pathLookup[keyLookup][method] = getObject;
    } else {
      pathLookup[keyLookup] = {
        [method]: getObject,
      };
    }
  });

  const endpoint = app.endpoint || config.API_ENDPOINT;
  const servers = [{
    description: app.description,
    url: `${endpoint}${app.api_base}`,
  }];

  const swaggerResp : { [key: string]: any } = {
    openapi: '3.0.0',
    info: {
      title: app.title,
      description: app.description,
      version: app.version,
    },
    servers,
    // schemes: ["https"],
    // produces: ["application/json"],

    paths: pathLookup,
  };

  if (app.contact_email) {
    swaggerResp.info.contact = {};
  }

  swaggerResp.components = {
    securitySchemes: {
      ApiToken: {
        type: 'apiKey',
        in: 'query',
        name: 'api_token',
      },
    },
  };
  // global security block
  swaggerResp.security = [{
    ApiToken: [],
  }];

  return swaggerResp;
};
