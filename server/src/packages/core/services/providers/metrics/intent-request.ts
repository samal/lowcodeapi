import Sequelize from 'sequelize';
import { safePromise, loggerService } from '../../../../../utilities';
import DBConfig from '../../../db';
import cryptograper from '../../../../../utilities/cryptograper';

const { connection } = DBConfig;

const { generateMD5 } = cryptograper;

export default async ({
  user, provider, method, intent: path,
} : {[key:string]: any}) => {
  loggerService.info(`Intent request: ${provider} ${method} ${path}`);
  const query = 'SELECT provider, method, intent, path FROM log_request WHERE user_ref_id=? AND provider=?;';
  const replacements = [user.ref_id, provider.toLowerCase()];

  const [error, data] = await safePromise(connection.query(query, {
    type: Sequelize.QueryTypes.SELECT,
    replacements,
  }));
  if (error) {
    throw error;
  }
  const map : { [key:string]: any} = {};

  data.forEach((item: { [key:string]: any}) => {
    console.log('metrics hash', `${item.provider}.${item.method.toUpperCase()}.${item.path}`);
    const intentHash = generateMD5(`${item.provider}.${item.method.toUpperCase()}.${item.path}`);
    if (map[item.provider]) {
      map[item.provider].total += 1;
      if (map[item.provider][intentHash]) {
        map[item.provider][intentHash] += 1;
      } else {
        map[item.provider][intentHash] = 1;
      }
    } else {
      map[item.provider] = {
        total: 1,
        [intentHash]: 1,
      };
    }
  });

  return map;
};
