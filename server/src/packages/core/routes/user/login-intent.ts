import express from 'express';
import dayjs from 'dayjs';
import rateLimit from 'express-rate-limit';

import { loggerService, safePromise } from '../../../../utilities';
import { endpoint } from '../../utilities';
import { notify as notifyEvent } from '../../../../utilities/notify';

import config from '../../../../config';
import { modules } from '../../common';
import random from '../../common/generate';
import Middlewares from '../../middlewares';

import {
  findUser, userLoginIntent, userService, tokenService,
} from '../../services/user';

const { getFullName, jwt } = modules;
const { generateApiToken } = random;
const { isAuthorized } = Middlewares;

if (!config.RATE_LIMIT.RATE_LIMIT_WINDOW_IN_MS) {
  throw new Error('Missing "config.RATE_LIMIT.RATE_LIMIT_WINDOW_IN_MS" in config file for core\'s user login-intent');
}

const notify_enabled = true;

const notify = async ({
  headers, type, user, action = '',
}: any) => {
  const ip = headers['x-real-ip'] || headers['x-forwarded-for'];

  const iptarget = ip ? `http://ipinfo.io/${ip}` : '';
  const text = `
  Magic ${type} ${action}

  User: ${getFullName(user)}
  Email: ${user.email}
  Date: ${dayjs().format('YYYY-MM-DD HH:mm A')}
  IP: ${ip || 'localhost'}
  
  ${iptarget}
  `;

  await notifyEvent(text);
};

const router = express.Router();

const rateLimitConfigForToken = rateLimit({
  windowMs: +config.RATE_LIMIT.RATE_LIMIT_WINDOW_IN_MS! || 60000, // 1 minutes
  // Limit each IP to 2 requests per `window` (here, per 1 minutes)
  max: +config.RATE_LIMIT.RATE_LIMIT_MAX_REQUEST! || 5,
  message: `Too many requests, only ${config.RATE_LIMIT.RATE_LIMIT_MAX_REQUEST
  } requests are allowed, every ${+config.RATE_LIMIT.RATE_LIMIT_WINDOW_IN_MS / 1000
  } seconds.`,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.get('/login', (req, res) => {
  const { token } = jwt.generateJwtToken(req.session.user);
  const redirect = endpoint.redirectToUIPage(token);
  return res.redirect(redirect);
});

router.post('/login', rateLimitConfigForToken, async (req, res) => {
  const { body, headers } = req;
  if (!body.email) {
    return res.status(422).json({
      message: 'Email is missing.',
    });
  }

  const user = { key: 'email', value: body.email };
  const [userError, userData] = await safePromise(findUser(user));
  if (userError) {
    loggerService.error('userError', userError, user);
    return res.status(500).json({
      message: 'Error validating email for login',
    });
  }

  let userDataObj = userData;

  if (userDataObj.email && userDataObj.password_hash) {
    const [newUserError, verfied] = await safePromise(userService.verifyPassword({
      password_hash: userDataObj.password_hash,
      password: body.password,
    }));

    if (newUserError || !verfied) {
      return res.status(403).json({
        message: 'Invalid password or varification failed.',
      });
    }

    const [loginLinkError, loginIntent] = await safePromise(
      userLoginIntent.createSession(userDataObj),
    );
    if (loginLinkError) {
      loggerService.error('loginError', loginLinkError.message);
      const redirect = endpoint.getLoginUrl('Error logging');
      return res.redirect(redirect);
    }

    if (req.session) {
      req.session.user = loginIntent.user;
    }
    // loggerService.info({ loginIntent });

    if (notify_enabled) {
      notify({
        headers, type: 'password', user: loginIntent, action: 'Completed',
      });
    }

    // return res.json({
    //   token: loginIntent.jwt.token,
    // });
    return res.redirect(`/account/login?token=${loginIntent.jwt.token}`);
  }

  if (!userDataObj.email) {
    const [newUserError, newUserData] = await safePromise(
      userService.create({
        email: body.email,
        password: body.password,
      }),
    );

    if (newUserError) {
      loggerService.error('newUserError', newUserError, user);
      return res.status(500).json({
        message: 'Error generating link',
      });
    }
    const data = newUserData.toJSON();
    data.isNew = true;
    userDataObj = data;

    const user_api_token = generateApiToken('r', 'at');
    const payload = {
      user_ref_id: userData.ref_id,
      api_token: user_api_token,
      active: true,
    };
    const [error] = await safePromise(tokenService.add(payload));

    if (error) {
      loggerService.error('Token Create Error', error);
    }
  }

  const [loginError, result] = await safePromise(
    userLoginIntent.process(userDataObj, {}),
  );
  if (loginError) {
    loggerService.error('processing error', loginError, user);
    return res.status(500).json({
      message: 'Error creating token.',
    });
  }

  const type = userDataObj.isNew === 'signup' ? 'Registration' : 'Login';

  if (notify_enabled) {
    notify({
      headers, type, user: userDataObj, action: 'Initiated',
    });
  }
  res.json({
    message: result.message,
    res: {
      success: result.success,
    },
  });
});

router.post('/password-change', rateLimitConfigForToken, isAuthorized, async (req, res) => {
  const { body } = req;
  const { user } : any = req.session;

  if (!body.password || !body.new_password || !body.new_password_2) {
    return res.status(422).json({
      message: 'All password field is required.',
    });
  }

  if (body.password === body.new_password) {
    return res.status(422).json({
      message: 'New password cannot be same as old password.',
    });
  }

  const userObj = { key: 'ref_id', value: user.ref_id };
  const [userError, userData] = await safePromise(findUser(userObj));

  if (userError) {
    loggerService.error('userError', userError, user);
    return res.status(500).json({
      message: 'Error finding user',
    });
  }

  const userDataObj = userData;

  if (userDataObj.password_hash) {
    const [newUserError, verfied] = await safePromise(userService.verifyPassword({
      password_hash: userDataObj.password_hash,
      password: body.password,
    }));

    if (newUserError || !verfied) {
      return res.status(403).json({
        message: 'Invalid password or varification failed.',
      });
    }

    const [error] = await safePromise(userService
      .changePassword({
        ...body, password_hash: userDataObj.password_hash,
      }, user));
    if (error) {
      loggerService.error('password update', error.message);
      return res.status(500).json({
        message: 'Error changing the password.',
        res: {},
      });
    }

    return res.json({
      message: 'Password changed',
    });
  }
  res.status(422).json({
    message: 'Now allowed to changed password.',
    res: {},
  });
});

router.get('/action', async (req, res) => {
  const { query, headers } = req;
  if (!query.token) {
    return res.status(422).json({
      message: 'Token missing in the url',
    });
  }

  const [loginLinkError, loginIntent] = await safePromise(
    userLoginIntent.verify(query),
  );
  if (loginLinkError) {
    loggerService.error('loginError', loginLinkError.message);
    const redirect = endpoint.getLoginUrl('Error logging');
    return res.redirect(redirect);
  }

  if (req.session) {
    req.session.user = loginIntent.user;
  }
  // loggerService.info({ loginIntent });

  if (notify_enabled) {
    notify({
      headers, type: query.type, user: loginIntent, action: 'Completed',
    });
  }

  let redirect = endpoint.redirectToUIPage(loginIntent.jwt.token);

  if (query.onboard) {
    redirect = `${redirect}&onboard=true`;
  }
  res.redirect(redirect);
});

export default router;
