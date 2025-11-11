// Providers and Custom API related modules
import mode from './mode.json';

import api from '../packages/api-access';
import apiExtra from '../packages/api-extra';

// Admin / Dashboard modules
import oauth from '../packages/oauth';
import openapi from '../packages/openapi';
import core from '../packages/core';

const availableModules: { [key: string]: any} = {
  oauth,
  core,
  openapi,
  apiExtra,
  api,
};

const modeMap: any = mode;
const list : any = Object.keys(modeMap);
const selected : string = list.length ? list[0] : '';

export { availableModules, mode, selected };
