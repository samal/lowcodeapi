/* eslint-disable no-unused-vars */
import Sequelize from 'sequelize';
import tokenService from './key-service';
import userService from './user';
import findUser from './find-user';
import userLoginIntent from './user-login';
import usersActivatedProvider from './activated';

import { safePromise } from '../../../../utilities';
import db from '../../db';

const { connection } = db;

const fetchUserAvatar = async (user: any) => {
  const dbQuery = `
    SELECT 
      DISTINCT pct.provider_data as data,
      pct.provider

    FROM providers_credential_and_tokens pct
    INNER JOIN users_activated_providers uap ON (uap.user_ref_id=pct.user_ref_id)
    WHERE pct.user_ref_id=?;
  `;

  const [queryError, list] = await safePromise(connection.query(dbQuery, {
    type: Sequelize.QueryTypes.SELECT,
    replacements: [
      user.ref_id,
    ],
  }));

  if (queryError) {
    throw queryError;
  }

  const l = list ? list.filter((i: any) => !!i.data) : [];
  const obj: {[key:string]: any} = {};

  l.forEach((i: any) => {
    const provider = i.provider.toLowerCase();
    if (provider === 'twitter') {
      obj[provider] = i.data.profile_image_url_https.split('_normal').join('');
    } else {
      obj[provider] = i.data.picture;
    }
  });
  return obj;
};

export {
  tokenService,
  findUser,
  fetchUserAvatar,
  userService,
  usersActivatedProvider,
  userLoginIntent,
};
