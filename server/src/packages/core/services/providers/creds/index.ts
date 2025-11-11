import Sequelize from 'sequelize';
import { loggerService, safePromise } from '../../../../../utilities';
import DBConfig from '../../../db';

const { connection } = DBConfig;

export default async (user: { [key: string]: any } = {}) => {
  let query = `
    SELECT
        pro.*
    FROM providers_credential_and_tokens pro
    WHERE pro.user_ref_id=?
    `;

  const replacements = [user.user_ref_id || user.ref_id];
  if (user.provider) {
    query += ' AND pro.provider=? AND pro.auth_type=? LIMIT 1;';
    replacements.push(user.provider);
    replacements.push(user.auth_type || 'OAUTH2.0');
  } else {
    query += ';';
  }

  const [queryError, tokenList] = await safePromise(connection.query(query, {
    type: Sequelize.QueryTypes.SELECT,
    replacements,
  }));

  if (queryError) {
    loggerService.error(queryError);
    throw new Error(queryError.message);
  }

  const token: { [key: string]: any } = {};
  if (tokenList && tokenList.length) {
    tokenList.forEach((tokenItem: { [key: string]: any }) => {
      const item = { ...tokenItem };
      const provider = item.provider.toString().toLowerCase();
      let map = null;
      if (token[provider]) {
        map = { ...token[provider] };
      } else {
        if (item.credentials && typeof item.credentials === 'string') {
          item.credentials = JSON.parse(item.credentials);
        }
        if (item.config && typeof item.config === 'string') {
          item.config = JSON.parse(item.config);
        }
        map = {
          ...item.config,
        };
      }
      if (item.auth_type) {
        map[item.auth_type] = {
          ...item.config,
        };
      }

      // SQLite handling or MySQL db with no json support
      if (item.credentials && typeof item.credentials === 'string') {
        item.credentials = JSON.parse(item.credentials);
      }
      if (['OAUTH2.0', 'OAUTH1.0', 'OAUTH'].includes(item.auth_type) && item.credentials) {
        map.creds = {
          ...item.credentials,
        };
        if (map[item.auth_type]) {
          map[item.auth_type].creds = {
            ...item.credentials,
          };
        }
      }
      loggerService.info('map', map);

      token[provider] = map;
    });
  }

  return token;
};
