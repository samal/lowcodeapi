import { prisma } from './prisma';
import { getDatabaseProvider, currentProvider, isPostgreSQL, isMySQL } from './prisma/provider';
import { executeRawQuery, executeRawQuerySafe } from './prisma/query-builder';

export default {
  prisma,
  // Provider detection utilities
  getDatabaseProvider,
  currentProvider,
  isPostgreSQL,
  isMySQL,
  // Query utilities (for multi-database support)
  executeRawQuery,
  executeRawQuerySafe,
};

// Re-export for convenience
export { prisma };
export { getDatabaseProvider, currentProvider, isPostgreSQL, isMySQL };
export { executeRawQuery, executeRawQuerySafe };
