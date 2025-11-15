/**
 * Database Provider Detection and Utilities
 * 
 * Detects the database provider from DATABASE_URL and provides
 * utilities for handling provider-specific differences.
 */

export type DatabaseProvider = 'mysql' | 'postgresql';

/**
 * Detects the database provider from DATABASE_URL environment variable
 */
export function getDatabaseProvider(): DatabaseProvider {
  const url = process.env.DATABASE_URL || '';
  
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    return 'postgresql';
  }
  
  // Default to MySQL (also handles mysql://, mariadb://, etc.)
  return 'mysql';
}

/**
 * Gets the current database provider
 */
export const currentProvider = getDatabaseProvider();

/**
 * Checks if the current provider is PostgreSQL
 */
export function isPostgreSQL(): boolean {
  return currentProvider === 'postgresql';
}

/**
 * Checks if the current provider is MySQL
 */
export function isMySQL(): boolean {
  return currentProvider === 'mysql';
}

