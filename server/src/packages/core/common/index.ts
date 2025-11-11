import * as jwtModule from './key-hash';
import * as randomModule from './generate';
import * as generateModule from './id';
import * as cacheKeyModule from './cache';

interface Name {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
}

function getFullName(obj: Name = {}): string {
  let fullname = '';
  if (obj.first_name) {
    fullname += obj.first_name;
  }
  if (obj.middle_name) {
    fullname += ` ${obj.middle_name}`;
  }
  if (obj.last_name) {
    fullname += ` ${obj.last_name}`;
  }
  return fullname;
}

export type FullNameModule = typeof getFullName;
export type JwtModule = typeof jwtModule;
export type RandomModule = typeof randomModule;
export type GenerateModule = typeof generateModule;
export type CacheKeyModule = typeof cacheKeyModule;

export const modules = {
  jwt: jwtModule,
  getFullName,
  random: randomModule.default,
  generate: generateModule.default,
  token: randomModule.default.token,
  getCacheKey: cacheKeyModule.default,
};
