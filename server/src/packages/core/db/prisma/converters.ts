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

/**
 * UsersAPIToken field mappings
 * Maps API snake_case → Prisma format
 * Currently Prisma uses snake_case, so this is 1:1, but ready for camelCase migration
 */
export const USERS_API_TOKEN_FIELD_MAP = {
  ref_id: 'ref_id', // Will be 'refId' if we update schema to camelCase
  user_ref_id: 'user_ref_id', // Will be 'userRefId'
  api_token: 'api_token', // Will be 'apiToken'
  api_token_credits: 'api_token_credits', // Will be 'apiTokenCredits'
  api_credit_consumed: 'api_credit_consumed', // Will be 'apiCreditConsumed'
  last_used: 'last_used', // Will be 'lastUsed'
  api_token_expiry: 'api_token_expiry', // Will be 'apiTokenExpiry'
  api_token_config: 'api_token_config', // Will be 'apiTokenConfig'
  created_at: 'created_at', // Will be 'createdAt'
  updated_at: 'updated_at', // Will be 'updatedAt'
} as const;

/**
 * Convert UsersAPIToken from snake_case (API format) to Prisma format
 */
export function usersApiTokenSnakeCaseToCamelCase(apiToken: any): any {
  if (!apiToken) return null;
  
  const prismaToken: any = {
    // Fields that don't need conversion (already match)
    active: apiToken.active !== undefined ? apiToken.active : false,
    remark: apiToken.remark,
  };
  
  // Map snake_case fields using field map
  Object.entries(USERS_API_TOKEN_FIELD_MAP).forEach(([apiKey, prismaKey]) => {
    if (apiToken[apiKey] !== undefined) {
      prismaToken[prismaKey] = apiToken[apiKey];
    }
  });
  
  // Set timestamps if not provided (required by Prisma schema)
  if (!prismaToken.created_at) {
    prismaToken.created_at = new Date();
  }
  if (!prismaToken.updated_at) {
    prismaToken.updated_at = new Date();
  }
  
  // Remove undefined values to avoid passing them to Prisma
  const cleaned: any = {};
  for (const [key, value] of Object.entries(prismaToken)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Convert UsersAPIToken from Prisma format to snake_case (API format)
 */
export function usersApiTokenCamelCaseToSnakeCase(prismaToken: any): any {
  if (!prismaToken) return null;
  
  const apiToken: any = {
    // Fields that don't need conversion
    id: prismaToken.id,
    active: prismaToken.active,
    remark: prismaToken.remark,
  };
  
  // Map Prisma fields back to snake_case API format
  Object.entries(USERS_API_TOKEN_FIELD_MAP).forEach(([apiKey, prismaKey]) => {
    if (prismaToken[prismaKey] !== undefined) {
      apiToken[apiKey] = prismaToken[prismaKey];
    }
  });
  
  return apiToken;
}

/**
 * UsersLoginIntent field mappings
 * Maps API snake_case → Prisma format
 */
export const USERS_LOGIN_INTENT_FIELD_MAP = {
  ref_id: 'ref_id', // Will be 'refId' if we update schema to camelCase
  user_ref_id: 'user_ref_id', // Will be 'userRefId'
  login_intent: 'login_intent', // Will be 'loginIntent'
  login_code_hash: 'login_code_hash', // Will be 'loginCodeHash'
  expires_at: 'expires_at', // Will be 'expiresAt'
  login_at: 'login_at', // Will be 'loginAt'
  created_at: 'created_at', // Will be 'createdAt'
  updated_at: 'updated_at', // Will be 'updatedAt'
} as const;

/**
 * Convert UsersLoginIntent from snake_case (API format) to Prisma format
 */
export function usersLoginIntentSnakeCaseToCamelCase(apiIntent: any): any {
  if (!apiIntent) return null;
  
  const prismaIntent: any = {
    // Fields that don't need conversion (already match)
    id: apiIntent.id,
    active: apiIntent.active !== undefined ? apiIntent.active : true,
    attempt: apiIntent.attempt !== undefined ? apiIntent.attempt : 0,
  };
  
  // Map snake_case fields using field map
  Object.entries(USERS_LOGIN_INTENT_FIELD_MAP).forEach(([apiKey, prismaKey]) => {
    if (apiIntent[apiKey] !== undefined) {
      prismaIntent[prismaKey] = apiIntent[apiKey];
    }
  });
  
  // Set timestamps if not provided (required by Prisma schema)
  if (!prismaIntent.created_at) {
    prismaIntent.created_at = new Date();
  }
  if (!prismaIntent.updated_at) {
    prismaIntent.updated_at = new Date();
  }
  
  // Remove undefined values to avoid passing them to Prisma
  const cleaned: any = {};
  for (const [key, value] of Object.entries(prismaIntent)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Convert UsersLoginIntent from Prisma format to snake_case (API format)
 */
export function usersLoginIntentCamelCaseToSnakeCase(prismaIntent: any): any {
  if (!prismaIntent) return null;
  
  const apiIntent: any = {
    // Fields that don't need conversion
    id: prismaIntent.id,
    active: prismaIntent.active,
    attempt: prismaIntent.attempt,
  };
  
  // Map Prisma fields back to snake_case API format
  Object.entries(USERS_LOGIN_INTENT_FIELD_MAP).forEach(([apiKey, prismaKey]) => {
    if (prismaIntent[prismaKey] !== undefined) {
      apiIntent[apiKey] = prismaIntent[prismaKey];
    }
  });
  
  return apiIntent;
}

/**
 * UsersActivatedProviders field mappings
 * Maps API snake_case → Prisma format
 * Note: active is Int (TinyInt) in Prisma, but Boolean in API
 */
export const USERS_ACTIVATED_PROVIDERS_FIELD_MAP = {
  ref_id: 'ref_id', // Will be 'refId' if we update schema to camelCase
  user_ref_id: 'user_ref_id', // Will be 'userRefId'
  provider_ref_id: 'provider_ref_id', // Will be 'providerRefId'
  created_at: 'created_at', // Will be 'createdAt'
  updated_at: 'updated_at', // Will be 'updatedAt'
} as const;

/**
 * Convert UsersActivatedProviders from snake_case (API format) to Prisma format
 * Handles active: boolean → active: Int (1/0)
 */
export function usersActivatedProvidersSnakeCaseToCamelCase(apiProvider: any): any {
  if (!apiProvider) return null;
  
  const prismaProvider: any = {
    // Fields that don't need conversion
    id: apiProvider.id,
  };
  
  // Map snake_case fields using field map
  Object.entries(USERS_ACTIVATED_PROVIDERS_FIELD_MAP).forEach(([apiKey, prismaKey]) => {
    if (apiProvider[apiKey] !== undefined) {
      prismaProvider[prismaKey] = apiProvider[apiKey];
    }
  });
  
  // Handle active: boolean → Int (1/0) for Prisma
  if (apiProvider.active !== undefined) {
    prismaProvider.active = apiProvider.active === true || apiProvider.active === 1 ? 1 : 0;
  } else {
    prismaProvider.active = 1; // Default
  }
  
  // Set timestamps if not provided (required by Prisma schema)
  if (!prismaProvider.created_at) {
    prismaProvider.created_at = new Date();
  }
  if (!prismaProvider.updated_at) {
    prismaProvider.updated_at = new Date();
  }
  
  // Remove undefined values to avoid passing them to Prisma
  const cleaned: any = {};
  for (const [key, value] of Object.entries(prismaProvider)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Convert UsersActivatedProviders from Prisma format to snake_case (API format)
 * Handles active: Int (1/0) → active: boolean
 */
export function usersActivatedProvidersCamelCaseToSnakeCase(prismaProvider: any): any {
  if (!prismaProvider) return null;
  
  const apiProvider: any = {
    // Fields that don't need conversion
    id: prismaProvider.id,
  };
  
  // Map Prisma fields back to snake_case API format
  Object.entries(USERS_ACTIVATED_PROVIDERS_FIELD_MAP).forEach(([apiKey, prismaKey]) => {
    if (prismaProvider[prismaKey] !== undefined) {
      apiProvider[apiKey] = prismaProvider[prismaKey];
    }
  });
  
  // Handle active: Int (1/0) → boolean for API
  if (prismaProvider.active !== undefined) {
    apiProvider.active = prismaProvider.active === 1 || prismaProvider.active === true;
  }
  
  return apiProvider;
}

/**
 * ProvidersCredentialAndToken field mappings
 * Maps API snake_case → Prisma format
 * Currently Prisma uses snake_case, so this is 1:1, but ready for camelCase migration
 */
export const PROVIDERS_CREDENTIAL_AND_TOKEN_FIELD_MAP = {
  user_ref_id: 'user_ref_id', // Will be 'userRefId' if we update schema to camelCase
  provider: 'provider',
  auth_type: 'auth_type', // Will be 'authType'
  config: 'config',
  provider_data: 'provider_data', // Will be 'providerData'
  credentials: 'credentials',
  descriptions: 'descriptions',
  remark: 'remark',
  provider_error: 'provider_error', // Will be 'providerError'
  created_at: 'created_at', // Will be 'createdAt'
  updated_at: 'updated_at', // Will be 'updatedAt'
} as const;

/**
 * Convert ProvidersCredentialAndToken from snake_case (API format) to Prisma format
 */
export function providersCredentialAndTokenSnakeCaseToCamelCase(apiCred: any): any {
  if (!apiCred) return null;
  
  const prismaCred: any = {
    // Fields that don't need conversion (already match)
    active: apiCred.active !== undefined ? apiCred.active : true,
  };
  
  // Map snake_case fields using field map
  Object.entries(PROVIDERS_CREDENTIAL_AND_TOKEN_FIELD_MAP).forEach(([apiKey, prismaKey]) => {
    if (apiCred[apiKey] !== undefined) {
      prismaCred[prismaKey] = apiCred[apiKey];
    }
  });
  
  // Set timestamps if not provided (required by Prisma schema)
  if (!prismaCred.created_at) {
    prismaCred.created_at = new Date();
  }
  if (!prismaCred.updated_at) {
    prismaCred.updated_at = new Date();
  }
  
  // Remove undefined values to avoid passing them to Prisma
  const cleaned: any = {};
  for (const [key, value] of Object.entries(prismaCred)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Convert ProvidersCredentialAndToken from Prisma format to snake_case (API format)
 */
export function providersCredentialAndTokenCamelCaseToSnakeCase(prismaCred: any): any {
  if (!prismaCred) return null;
  
  const apiCred: any = {
    // Fields that don't need conversion
    id: prismaCred.id,
    active: prismaCred.active,
  };
  
  // Map Prisma fields back to snake_case API format
  Object.entries(PROVIDERS_CREDENTIAL_AND_TOKEN_FIELD_MAP).forEach(([apiKey, prismaKey]) => {
    if (prismaCred[prismaKey] !== undefined) {
      apiCred[apiKey] = prismaCred[prismaKey];
    }
  });
  
  return apiCred;
}

