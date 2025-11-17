import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import axios from 'axios';

dayjs.extend(utc);

import { modules } from '../../common';

import { loggerService, safePromise } from '../../../../utilities';

import { endpoint } from '../../utilities';

import {
  MemoryFileSystem, Engine, Template, RenderContext,
} from '../../template/liquid';
import { template } from '../../template';

import DBConfig from '../../db';
import { prisma } from '../../db/prisma';
import { usersLoginIntentSnakeCaseToCamelCase, usersLoginIntentCamelCaseToSnakeCase } from '../../db/prisma/converters';

import findUser from './find-user';
import userService from './user';

const { theme } = template;
const { random, jwt } = modules;

const selectUserIntentMessage = (isNew: boolean) => (isNew ? 'Check your email inbox the registration link is sent to your email' : 'Check your email inbox the access link is sent to your registered email');
const {
  API_TOKEN: api_token,
  APP_FROM_EMAIL: from_email,
  LOGIN_EMAIL_SUBJECT,
} = process.env;

const EMAIL_SUBJECT : string = LOGIN_EMAIL_SUBJECT || 'LowCodeAPI login link';

export default {
  process: async (user: { [key: string]: any }, { directLogin = false, onboard = false }) => {
    loggerService.info(user);

    const expires_at = dayjs().utc().add(1, 'hour').format();
    const login_code = random.token(32);
    const login_code_hash = login_code;
    const payload: any = {
      user_ref_id: user.ref_id,
      login_intent: 'token',
      login_code_hash,
      expires_at,
    };
    const prismaData = usersLoginIntentSnakeCaseToCamelCase(payload);
    const [error] = await safePromise(
      prisma.users_login_intents.create({ data: prismaData })
    );

    if (error) {
      loggerService.error('Inten error', error);
      throw new Error('Error generating login link');
    }

    let login_link = endpoint.getEmailLoginLink(login_code, user.isNew);

    if (onboard) {
      login_link = `${login_link}&onboard=true`;
    }
    if (directLogin) {
      const resp = {
        login_link,
      };
      return resp;
    }

    const emailTemplate = theme['email/login_link'].html;
    const context = {
      login_link,
    };

    const engine = new Engine();
    engine.fileSystem = new MemoryFileSystem(theme);
    const [contentError, content] = await safePromise(
      engine
        .parse(emailTemplate)
        .then((templateContext: Template) => templateContext.render(context))
        .then((html: string) => html),
    );

    if (contentError) {
      loggerService.error('contentError', contentError);
      throw new Error('Some error sending email');
    }

    const layout = theme['email/layout_v2'].html;

    const renderContext: RenderContext = { ...context, content };

    const [renderError, html] = await safePromise(
      engine
        .parse(layout)
        .then((layout: Template) => layout.render(renderContext))
        .then((html: string) => html),
    );

    if (renderError) {
      loggerService.error('renderError', renderError);
      throw new Error('Some error sending email');
    }

    const emaiLPayload = {
      from: from_email,
      to: user.email,
      email: user.email,
      subject: EMAIL_SUBJECT,
      html,
    };

    const options = {
      url: endpoint.sendEmail(api_token!),
      method: 'POST',
      data: {
        provider: 'mailgun',
        data: emaiLPayload,
      },
    };
    const [errorEmail, status] = await safePromise(axios(options));

    if (errorEmail) {
      const message = 'Error sending login link';
      loggerService.error(message, errorEmail.response);
      throw new Error(message);
    }

    const resp = {
      ...status,
      message: selectUserIntentMessage(!!user.new),
    };

    return resp;
  },
  verify: async (params: { [key: string]: any }) => {
    const { token } = params;
    const where = {
      login_intent: 'token',
      login_code_hash: token,
      active: 1,
    };
    // Convert active: 1 to active: true for Prisma
    const prismaWhere: any = {
      login_intent: where.login_intent,
      login_code_hash: where.login_code_hash,
      active: where.active === 1 ? true : where.active,
    };

    const [error, result] = await safePromise(
      prisma.users_login_intents.findFirst({ where: prismaWhere })
    );

    if (error) {
      const message = 'Error fetch the token details';
      loggerService.error(message, error.response);
      throw new Error(message);
    }

    if (!result) {
      loggerService.info('No such token found');
      const error: { [key: string]: any } = new Error('No such token found');
      error.code = 422;
      throw error;
    }

    const data = usersLoginIntentCamelCaseToSnakeCase(result);
    const linkExpired = dayjs().isAfter(dayjs(data.expires_at));

    if (linkExpired) {
      const message = 'Link expired';
      loggerService.info(message);
      const error: { [key: string]: any } = new Error(message);
      error.code = 422;
      throw error;
    }

    const user = { key: 'ref_id', value: data.user_ref_id };
    const [userError, userData] = await safePromise(findUser(user));
    if (userError) {
      const message = 'Error fetching the user details';
      loggerService.error(message, userError.message);
      const error: { [key: string]: any } = new Error(message);
      error.code = 500;
      throw error;
    }

    if (!userData.email) {
      const message = 'No account found with this token';
      loggerService.info(message);
      const error: { [key: string]: any } = new Error(message);
      error.code = 422;
      throw error;
    }

    if (!userData.email_verified) {
      const update = {
        email_verified: true,
      };

      const [userUpdateError] = await safePromise(userService.update(update, {
        ref_id: userData.ref_id,
      }));
      if (userUpdateError) {
        const message = 'Error updating the user details';
        loggerService.error(message, userUpdateError.message);
      }
    }

    const update: { [key: string]: any } = {
      login_at: dayjs().utc().format(),
      attempt: data.attempt + 1,
      active: false,
    };
    
    // Find intent by login_code_hash first, then update by id (unique field)
    const existingIntent = await prisma.users_login_intents.findFirst({
      where: prismaWhere,
    });
    
    if (!existingIntent) {
      throw new Error('Login intent not found');
    }

    const [errorInt] = await safePromise(
      prisma.users_login_intents.update({
        where: { id: existingIntent.id },
        data: update,
      })
    );

    if (errorInt) {
      const message = 'Error updating login details';
      loggerService.error(message, errorInt.response);
      throw new Error(message);
    }

    const userSession = {
      id: userData.id,
      ref_id: userData.ref_id,
      first_name: userData.first_name,
      last_name: userData.last_name,
    };
    const jwtToken = jwt.generateJwtToken(userSession);

    return {
      auth: true,
      jwt: jwtToken,
      user: { ...userSession, email: userData.email },
    };
  },
  createSession: async (userData: { [key: string]: any }) => {
    const userSession = {
      id: userData.id,
      ref_id: userData.ref_id,
      first_name: userData.first_name,
      last_name: userData.last_name,
    };
    const jwtToken = jwt.generateJwtToken(userSession);

    return {
      auth: true,
      jwt: jwtToken,
      user: { ...userSession, email: userData.email },
    };
  },
};
