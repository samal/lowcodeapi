/**
 * Conversion utilities for Prisma migration
 * 
 * These utilities convert between:
 * - API format (snake_case) - what the API currently uses
 * - Prisma format (snake_case currently, but can be updated to camelCase)
 * 
 * Note: Since Prisma was introspected, it currently uses snake_case.
 * If we update the schema to use camelCase with @map, these converters
 * will handle the conversion automatically.
 */

/**
 * Generic converter: snake_case API → Prisma format
 * Currently both use snake_case, but this allows for future camelCase migration
 */
export function toPrisma<T extends Record<string, any>>(
  data: T,
  fieldMap: Record<string, string>
): Partial<T> {
  const result: any = {};
  for (const [apiKey, prismaKey] of Object.entries(fieldMap)) {
    if (data[apiKey] !== undefined) {
      result[prismaKey] = data[apiKey];
    }
  }
  return result;
}

/**
 * Generic converter: Prisma format → snake_case API
 */
export function toApi<T extends Record<string, any>>(
  data: T,
  fieldMap: Record<string, string>
): Partial<T> {
  const result: any = {};
  for (const [apiKey, prismaKey] of Object.entries(fieldMap)) {
    if (data[prismaKey] !== undefined) {
      result[apiKey] = data[prismaKey];
    }
  }
  return result;
}

/**
 * User field mappings
 * Maps API snake_case → Prisma format
 * Currently Prisma uses snake_case, so this is 1:1, but ready for camelCase migration
 */
export const USER_FIELD_MAP = {
  ref_id: 'ref_id', // Will be 'refId' if we update schema to camelCase
  entity_id: 'entity_id', // Will be 'entityId'
  password_hash: 'password_hash', // Will be 'passwordHash'
  first_name: 'first_name', // Will be 'firstName'
  middle_name: 'middle_name', // Will be 'middleName'
  last_name: 'last_name', // Will be 'lastName'
  profile_picture: 'profile_picture', // Will be 'profilePicture'
  country_code: 'country_code', // Will be 'countryCode'
  email_verified: 'email_verified', // Will be 'emailVerified'
  login_at: 'login_at', // Will be 'loginAt'
  last_login_at: 'last_login_at', // Will be 'lastLoginAt'
  created_at: 'created_at', // Will be 'createdAt'
  updated_at: 'updated_at', // Will be 'updatedAt'
  company_name: 'company_name', // Will be 'companyName'
  user_token: 'user_token', // Will be 'userToken'
  service_limit: 'service_limit', // Will be 'serviceLimit'
  cache_duration: 'cache_duration', // Will be 'cacheDuration'
  full_access: 'full_access', // Will be 'fullAccess'
  billing_enabled: 'billing_enabled', // Will be 'billingEnabled'
  export_user: 'export_user', // Will be 'exportUser'
} as const;

/**
 * Convert User from snake_case (API format) to Prisma format
 * Currently both use snake_case, so this is mostly pass-through
 * but handles all fields consistently
 */
export function userSnakeCaseToCamelCase(apiUser: any): any {
  if (!apiUser) return null;
  
  const prismaUser: any = {
    // Fields that don't need conversion (already match)
    email: apiUser.email,
    username: apiUser.username,
    avatars: apiUser.avatars,
    extra: apiUser.extra,
    active: apiUser.active,
    phone: apiUser.phone,
    gender: apiUser.gender,
  };
  
  // Map snake_case fields using field map
  Object.entries(USER_FIELD_MAP).forEach(([apiKey, prismaKey]) => {
    if (apiUser[apiKey] !== undefined) {
      prismaUser[prismaKey] = apiUser[apiKey];
    }
  });
  
  return prismaUser;
}

/**
 * Convert User from Prisma format to snake_case (API format)
 */
export function userCamelCaseToSnakeCase(prismaUser: any): any {
  if (!prismaUser) return null;
  
  const apiUser: any = {
    // Fields that don't need conversion
    id: prismaUser.id,
    email: prismaUser.email,
    username: prismaUser.username,
    avatars: prismaUser.avatars,
    extra: prismaUser.extra,
    active: prismaUser.active,
    phone: prismaUser.phone,
    gender: prismaUser.gender,
  };
  
  // Map Prisma fields back to snake_case API format
  Object.entries(USER_FIELD_MAP).forEach(([apiKey, prismaKey]) => {
    if (prismaUser[prismaKey] !== undefined) {
      apiUser[apiKey] = prismaUser[prismaKey];
    }
  });
  
  return apiUser;
}

