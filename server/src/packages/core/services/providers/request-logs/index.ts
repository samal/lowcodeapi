import Sequelize from 'sequelize';
import { safePromise } from '../../../../../utilities';
import DBConfig from '../../../db';

const { connection } = DBConfig;

const DEFAULT_COLUMN = 'method, service_type, provider, via_provider, payload as request_payload, response, client_ip, client_headers, response_headers, status_code, started_at, completed_at';
export default async ({
  skip, method, provider, path, user, type = 'success', column = DEFAULT_COLUMN,
}: {[key:string]: any}) => {
  let query = `SELECT ${column.trim()}`;

  if (type === 'error') {
    query = `${query}, error FROM log_request WHERE method=? AND provider=? AND intent=? AND user_ref_id=? AND (is_error=true OR error IS NOT NULL) `;
  } else {
    query = `${query} FROM log_request WHERE method=? AND provider=? AND intent=? AND user_ref_id=? AND (is_error=false OR is_error is NULL OR error IS NULL)`;
  }

  query = `${query} ORDER BY created_at DESC LIMIT ? OFFSET ?;`;
  const replacements = [method, provider, path, user.ref_id, 20, +skip || 0];

  const [error, data] = await safePromise(connection.query(query, {
    type: Sequelize.QueryTypes.SELECT,
    replacements,
  }));
  if (error) {
    throw error;
  }

  return data;
};
