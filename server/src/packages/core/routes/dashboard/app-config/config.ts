import express, { Request, Response, Router } from 'express';

import config from '../../../../../config';

const router: Router = express.Router();

const {
  PROTOCOL, APP_DOMAIN, API_ENDPOINT, UI_DOMAIN,
} = config;
const { READ_MODE, GRACE_MODE } = config;

const A_E = API_ENDPOINT || APP_DOMAIN;
const U_D = UI_DOMAIN || APP_DOMAIN;

let login : any = {
  disable_email: !!process.env.DISABLE_LOGIN_USING_EMAIL || false,
  disable_google: !!process.env.DISABLE_LOGIN_USING_GOOGLE || false,
};

let signup : any = {
  disable_email: !!process.env.DISABLE_SIGNUP_USING_EMAIL || false,
  disable_google: !!process.env.DISABLE_SIGNUP_USING_GOOGLE || false,
};

if (process.env.DISABLE_LOGIN) {
  login = null;
}

if (process.env.DISABLE_SIGNUP) {
  signup = null;
}

router.get('/config', async (req: Request, res: Response) => {
  const payload: { [key: string]: any } = {
    app_endpoint: `${PROTOCOL}://${APP_DOMAIN}`,
    api_endpoint: `${PROTOCOL}://${A_E}`,
  };

  if (U_D) {
    payload.ui_domain = `${PROTOCOL}://${U_D}`;
  }
  if (READ_MODE) {
    payload.read_mode = true;
  }

  if (GRACE_MODE) {
    payload.grace_mode = true;
  }
  payload.login = login;
  payload.signup = signup;

  res.json({
    message: 'config',
    res: payload,
  });
});

export default router;
