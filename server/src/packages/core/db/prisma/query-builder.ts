/**
 * Database Query Builder
 * 
 * Provides abstraction layer for executing raw SQL queries
 * that work with both MySQL and PostgreSQL.
 */

import { PrismaClient } from '@prisma/client';
import { getDatabaseProvider, DatabaseProvider } from './provider';

/**
 * Converts MySQL-style placeholders (?) to PostgreSQL-style ($1, $2, etc.)
 * or keeps MySQL placeholders if provider is MySQL
 */
export function convertPlaceholders(
  query: string,
  provider: DatabaseProvider
): string {
  if (provider === 'postgresql') {
    // Convert ? placeholders to $1, $2, $3, etc.
    let paramIndex = 1;
    return query.replace(/\?/g, () => `$${paramIndex++}`);
  }
  
  // MySQL uses ? as-is
  return query;
}

/**
 * Executes a raw SQL query with automatic placeholder conversion
 * based on the current database provider.
 * 
 * @param prisma - Prisma client instance
 * @param query - SQL query with ? placeholders (MySQL style)
 * @param replacements - Array of values to replace placeholders
 * @returns Promise with query result
 * 
 * @example
 * // Works with both MySQL and PostgreSQL
 * const result = await executeRawQuery(
 *   prisma,
 *   'SELECT * FROM users WHERE email = ? AND active = ?',
 *   ['user@example.com', true]
 * );
 */
export async function executeRawQuery<T = any>(
  prisma: PrismaClient,
  query: string,
  replacements: any[] = []
): Promise<T> {
  const provider = getDatabaseProvider();
  const convertedQuery = convertPlaceholders(query, provider);
  
  return prisma.$queryRawUnsafe(convertedQuery, ...replacements);
}

/**
 * Executes a raw SQL query with automatic placeholder conversion
 * and error handling via safePromise pattern.
 * 
 * @param prisma - Prisma client instance
 * @param query - SQL query with ? placeholders (MySQL style)
 * @param replacements - Array of values to replace placeholders
 * @returns Promise with [error, data] tuple
 * 
 * @example
 * const [error, data] = await executeRawQuerySafe(
 *   prisma,
 *   'SELECT * FROM users WHERE email = ?',
 *   ['user@example.com']
 * );
 * if (error) throw error;
 */
export async function executeRawQuerySafe<T = any>(
  prisma: PrismaClient,
  query: string,
  replacements: any[] = []
): Promise<[Error | null, T | null]> {
  try {
    const result = await executeRawQuery<T>(prisma, query, replacements);
    return [null, result];
  } catch (error) {
    return [error as Error, null];
  }
}

