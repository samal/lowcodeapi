import { Request, Response, NextFunction } from 'express';

import { verify } from '../common/key-hash';
import { safePromise } from '../../../utilities';
import { endpoint } from '../utilities';

const redirect = endpoint.getLoginUrl('');

const isAuthorized = async (req : Request, res: Response, next: NextFunction) => {
  const { user } = req.session;
  if (user && !req.headers['x-auth-token']) {
    return next();
  } if (req.headers['x-auth-token'] && typeof req.headers['x-auth-token'] === 'string') {
    const [error, jwtUser] = await safePromise(verify(req.headers['x-auth-token']));
    if (error || !jwtUser || !jwtUser.id) {
      return res.status(401).json({
        authorized: false,
      });
    }
    req.session.user = {
      ...jwtUser,
    };
    return next();
  }
  if (req.xhr || req.headers['x-auth-token']) {
    return res.status(401).json({
      authorized: false,
    });
  }
  res.redirect(redirect);
};

export default {
  isAuthorized,
};
