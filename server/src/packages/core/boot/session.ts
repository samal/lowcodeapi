import { Application } from 'express';
import connectRedis, { RedisStore } from 'connect-redis';
import session from 'express-session';
import redisClient, { RedisClientType } from '../../../utilities/redis-client';

import config from '../../../config';

declare module 'express-session' {
  // eslint-disable-next-line no-unused-vars
  interface SessionData {
      user: {
        id: any,
        [key: string]: any
      };
  }
}
const client: RedisClientType = redisClient();
export default (app: Application): void => {
  const { SESSION_SECRET_KEY, SESSION_EXPIRY, SESSION_STORE_IN_REDIS = false } = config;

  if (!SESSION_EXPIRY || typeof SESSION_EXPIRY !== 'string') {
    throw new Error('Missing "SESSION_EXPIRY" in config file');
  }

  if (!SESSION_SECRET_KEY || typeof SESSION_SECRET_KEY !== 'string') {
    throw new Error('Missing "SESSION_SECRET_KEY" in config file');
  }

  const EXPIRY = (+SESSION_EXPIRY || 864000) * 60 * 60 * 24 * 7;
  if (SESSION_STORE_IN_REDIS) {
    const RedisStore: RedisStore = connectRedis(session);
    app.use(
      session({
        secret: SESSION_SECRET_KEY,
        store: new RedisStore({
          client,
        }),
        saveUninitialized: true,
        cookie: { maxAge: EXPIRY },
        resave: true,
      }),
    );
  } else {
    app.use(
      session({
        secret: SESSION_SECRET_KEY,
        saveUninitialized: true,
        cookie: { maxAge: EXPIRY },
        resave: true,
      }),
    );
  }
};
