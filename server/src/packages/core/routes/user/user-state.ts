import express, { Request, Response, Router } from 'express';

import { loggerService, cacheService, safePromise } from '../../../../utilities';
import Middlewares from '../../middlewares';

import { modules } from '../../common';
import {
  findUser,
  fetchUserAvatar,
  tokenService,
} from '../../services/user';

import userState from './user-config';

const {
  API_TOKEN_LIMIT = +userState.API_TOKEN_LIMIT,
  CAHCE_KEY_EXPIRY_VALUE = 0,
} = process.env;

interface Session {
  user: {
    id: any,
    [key: string]: any
  };
}
const { getFullName } = modules;
const { isAuthorized } = Middlewares;
const router: Router = express.Router();

router.get('/user-state', isAuthorized, async (req: Request, res: Response) => {
  const { user } = req.session as Session;
  if (!user || !user.ref_id) {
    return res.status(401).json({
      message: 'Login to access the user state.',
      res: null,
    });
  }

  const { ref_id } : { [key: string]: any } = user;

  const cache_key = `user_state_${ref_id}`;
  const [cacheError, cachedData] = await safePromise(cacheService.cacheGet(cache_key));

  if (cacheError) {
    loggerService.error('cacheError', cacheError);
  }

  if (cachedData) {
    const cached_resp = JSON.parse(cachedData);
    const resp = {
      ...cached_resp,
      api_token_limit: +cached_resp.custom_api_token_limit || +API_TOKEN_LIMIT,
      custom_api_token_limit: undefined,
    };
    return res.json({
      message: 'User state (c)',
      res: { ...resp },
    });
  }
  const [error, userData] = await safePromise(findUser({ key: 'ref_id', value: ref_id }));
  if (error) {
    loggerService.error(error);
    return res.status(500).json({
      message: 'Error getting user info',
    });
  }

  const [tokenError, tokens] = await safePromise(tokenService.getAllByUserId(ref_id, {
    extract: true,
  }));
  if (tokenError) {
    loggerService.error(tokenError);
    return res.status(500).json({
      message: 'Error fetching tokens',
    });
  }

  // Remove this
  const [avatarsError, avatars] = await safePromise(fetchUserAvatar(user));
  if (avatarsError) {
    loggerService.error(avatarsError);
  }

  const registration_completed = true;

  const api_token = tokens ? tokens.api_token : null;

  const {
    api_token_limit, sanitize_allowed,
  } : { [key: string]: any } = userData.extra ? userData.extra : { };
  const resp : any = {
    registration_completed,
    user_ref_id: userData.ref_id,
    email: userData.email,
    api_token_limit: +api_token_limit || +API_TOKEN_LIMIT,
    api_token: registration_completed ? api_token : null,
    name: getFullName(userData) || userData.email,
    avatars: userData.avatars || avatars || {},
  };
  const cdaa = {
    ...resp,
    custom_api_token_limit: +api_token_limit,
  };
  cacheService.cacheSet(cache_key, JSON.stringify(cdaa), +CAHCE_KEY_EXPIRY_VALUE!)
    .catch((err: any) => {
      loggerService.info(`Cache set error cache_key ${cache_key}`, err);
    });

  // Editor privellages
  if (sanitize_allowed) {
    resp.sanitize_allowed = {
      allowed: sanitize_allowed,
      provider_release_allowed: userData.extra.sanitize_provider_release_allowed,
      provider_export_allowed: userData.extra.sanitize_provider_export_allowed,
      provider_add_allowed: userData.extra.sanitize_provider_add_allowed,
      provider_commit_allowed: userData.extra.sanitize_provider_commit_allowed,
      provider_edit_allowed: userData.extra.sanitize_provider_edit_allowed,
      provider_delete_allowed: userData.extra.sanitize_provider_delete_allowed,
      intent_add_allowed: userData.extra.sanitize_intent_add_allowed,
      intent_edit_allowed: userData.extra.sanitize_intent_edit_allowed,
      intent_delete_allowed: userData.extra.sanitize_intent_delete_allowed,
      intent_export_allowed: userData.extra.sanitize_intent_export_allowed,
    };
  }
  res.json({
    message: 'User state',
    res: resp,
  });
});
export default router;
