import { prisma } from '../../../db/prisma';

import { loggerService, safePromise } from '../../../../../utilities';
import tokenService from '../../user/key-service';

import config from '../../../../../config';

const OAUTH_CREDS = config.OAUTH;

export default async ({ api_token, provider }: { [key: string]: any }) => {
  const [tokenError, token] = await safePromise(tokenService.get(api_token));
  if (tokenError) {
    throw tokenError;
  }

  if (!token) {
    const error: { [key: string]: any } = new Error('Invalid api_token');
    error.code = 403;
    throw error;
  }

  // Disptach token use || API call in future
  try {
    tokenService.updateLastUsed(token.ref_id, token.user_ref_id);
  } catch (e) {
    loggerService.error('Last used update failed,', e);
  }

  // Only token check requested
  if (!provider) {
    return {
      is_valid_token: true,
      user_ref_id: token.user_ref_id,
      provider: false,
    };
  }

  // FIX: Due to Twitters double auth_type, we have to check the auth_type also
  const query = `
    SELECT 
      pct.config as config,
      pct.credentials as credentials,
      pct.provider_data as oauth_data
    FROM providers_credential_and_tokens pct
    INNER JOIN users_activated_providers uap ON (uap.user_ref_id=pct.user_ref_id)
    WHERE uap.user_ref_id=?
    AND pct.provider=? 
    AND uap.provider_ref_id=? 
    LIMIT 1;
  `;
  
  const [queryError, credsData] = await safePromise(
    prisma.$queryRawUnsafe(query, token.user_ref_id, provider.toLowerCase(), provider.toLowerCase())
  );

  if (queryError) {
    throw queryError;
  }

  if (!credsData || !credsData.length) {
    const error: { [key: string]: any } = new Error(`No access token is associated with this api_token, authorize your ${provider} with LowCodeAPI.`);
    error.code = 403;
    error.user_ref_id = token.user_ref_id;
    throw error;
  }

  // TODO: Decrypt the key and store in cache for a 1 hour.
  const creds = credsData[0];

  if (creds.credentials && typeof creds.credentials === 'string') {
    creds.credentials = JSON.parse(creds.credentials);
  }
  if (creds.config && typeof creds.config === 'string') {
    creds.config = JSON.parse(creds.config);
  }
  let oauth_creds = creds.credentials;

  // Populate default oauth creds
  if (!oauth_creds || !Object.keys(oauth_creds).length) {
    // loggerService.info(`No user specific creds found,
    // trying system default cred for "${provider}"`);
    const default_creds = OAUTH_CREDS[provider.toUpperCase()];
    if (default_creds
      && ((default_creds.CLIENT_ID && default_creds.CLIENT_SECRET)
      || (default_creds.API_KEY && default_creds.API_SECRET))) {
      oauth_creds = {
        ...default_creds,
      };
      loggerService.info(`using system default cred for "${provider}" ${Object.keys(oauth_creds)}`);
    }
  }
  return {
    creds: creds ? creds.config : null,
    oauth_data: creds.oauth_data,
    oauth_creds,
    user_ref_id: token.user_ref_id,
    provider,
  };
};
