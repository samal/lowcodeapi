import { Sequelize, Dialect } from 'sequelize';
import config from '../../../config';
import { prisma } from './prisma';

// User
// UserSchema - Migrated to Prisma, removed from Sequelize
// UsersAPITokenSchema - Migrated to Prisma, removed from Sequelize
// UsersLoginIntentSchema - Migrated to Prisma, removed from Sequelize
// UsersActivatedProvidersSchema - Migrated to Prisma, removed from Sequelize
// UsersProvidersSavedIntent - Migrated to Prisma, removed from Sequelize
// UsersProvidersIntentHydration - Migrated to Prisma, removed from Sequelize

// Provider
// ProvidersCredentialAndTokenSchema - Migrated to Prisma, removed from Sequelize
// TrackIntentRequest - Migrated to Prisma, removed from Sequelize (not currently used, converters ready)
// LogRequest - Migrated to Prisma, removed from Sequelize
// ProvidersIntentDefaultPayloads - Migrated to Prisma, removed from Sequelize

// Unified
// UsersUnifiedConfig - Migrated to Prisma, removed from Sequelize

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
    // UsersAPIToken: Migrated to Prisma - removed from Sequelize
    // UsersLoginIntent: Migrated to Prisma - removed from Sequelize
    // UsersActivatedProviders: Migrated to Prisma - removed from Sequelize
    // ProvidersCredentialAndToken: Migrated to Prisma - removed from Sequelize
    // TrackIntentRequest: Migrated to Prisma - removed from Sequelize
    // LogRequest: Migrated to Prisma - removed from Sequelize
    // UsersUnifiedConfig: Migrated to Prisma - removed from Sequelize
    // UsersProvidersSavedIntent: Migrated to Prisma - removed from Sequelize
    // UsersProvidersIntentHydration: Migrated to Prisma - removed from Sequelize
    // ProvidersIntentDefaultPayloads: Migrated to Prisma - removed from Sequelize
  },
  connect() {
    return sequelize;
  },
  connection: sequelize,
  Sequelize,
  // Expose Prisma for migration
  prisma,
};
