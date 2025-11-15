import { Sequelize, Dialect } from 'sequelize';
import config from '../../../config';
import { prisma } from './prisma';

// User
// UserSchema - Migrated to Prisma, removed from Sequelize
import UsersAPITokenSchema from './schema/user/UsersAPIToken';
import UsersLoginIntentSchema from './schema/user/UsersLoginIntent';
import UsersActivatedProvidersSchema from './schema/user/UsersActivatedProviders';
import UsersProvidersSavedIntent from './schema/user/UsersProvidersSavedIntent';
import UsersProvidersIntentHydration from './schema/user/UsersProvidersIntentHydration';

// Provider
import ProvidersCredentialAndTokenSchema from './schema/provider/ProvidersCredentialAndToken';
import ProvidersIntentDefaultPayloads from './schema/provider/ProvidersIntentDefaultPayloads';

import TrackIntentRequest from './schema/provider/TrackIntentRequest';
import LogRequest from './schema/provider/LogRequest';

// Unified
import UsersUnifiedConfig from './schema/unified/UsersUnifiedConfig';

const dbOptions = config.DB;

const sequelizePick: { [key: string]: Sequelize } = {
  mysql: new Sequelize(
    dbOptions.DB_NAME!,
    dbOptions.DB_USER!,
    dbOptions.DB_PASS,
    {
      host: dbOptions.DB_HOST,
      port: +dbOptions.DB_PORT!,
      dialect: dbOptions.DB_TYPE as Dialect,
      dialectOptions: {
        ssl: {
          rejectUnauthorized: dbOptions.SSL,
        },
      },
      pool: {
        max: 10,
        min: 2,
        acquire: 60000,
        idle: 30000,
      },
      // http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
      // operatorsAliases: false,
      // logging: false,
    },
  ),
  sqlite: new Sequelize({
    dialect: dbOptions.DB_TYPE as Dialect,
    storage: process.env.SQLITE_DATA_PATH,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: dbOptions.SSL,
      },
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 30000,
    },
    logging: false,
  }),
};

const sequelize = sequelizePick[dbOptions.DB_TYPE];

export default {
  models: {
    // User: Migrated to Prisma - removed from Sequelize
    UsersAPIToken: UsersAPITokenSchema(sequelize),
    UsersActivatedProviders: UsersActivatedProvidersSchema(sequelize),
    UsersProvidersSavedIntent: UsersProvidersSavedIntent(sequelize),
    UsersProvidersIntentHydration: UsersProvidersIntentHydration(sequelize),
    UsersLoginIntent: UsersLoginIntentSchema(sequelize),
    ProvidersCredentialAndToken: ProvidersCredentialAndTokenSchema(sequelize),
    ProvidersIntentDefaultPayloads: ProvidersIntentDefaultPayloads(sequelize),
    TrackIntentRequest: TrackIntentRequest(sequelize),
    LogRequest: LogRequest(sequelize),
    UsersUnifiedConfig: UsersUnifiedConfig(sequelize),
  },
  connect() {
    return sequelize;
  },
  connection: sequelize,
  Sequelize,
  // Expose Prisma for migration
  prisma,
};
