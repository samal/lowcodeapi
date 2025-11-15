import { prisma } from './index';

/**
 * Query helpers for Prisma
 * These helpers simplify common query patterns and handle field name conversions
 */

/**
 * Find user by key (handles ref_id → ref_id conversion)
 * Supports: id, ref_id, email, username
 */
export async function findUserByKey(key: string, value: any) {
  // Map API keys to Prisma field names
  // Currently both use snake_case, but this allows for future camelCase migration
  const keyMap: Record<string, string> = {
    id: 'id',
    ref_id: 'ref_id', // Will be 'refId' if schema uses camelCase
    email: 'email',
    username: 'username',
  };

  const prismaKey = keyMap[key] || key;
  
  return prisma.users.findFirst({
    where: { [prismaKey]: value },
  });
}

/**
 * Find user by multiple criteria
 */
export async function findUserBy(where: Record<string, any>) {
  return prisma.users.findFirst({
    where,
  });
}

/**
 * Find all users matching criteria
 */
export async function findUsers(where: Record<string, any> = {}) {
  return prisma.users.findMany({
    where,
  });
}

