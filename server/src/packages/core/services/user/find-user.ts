import { safePromise } from '../../../../utilities';
import { findUserByKey } from '../../db/prisma/helpers';
import { userCamelCaseToSnakeCase } from '../../db/prisma/converters';

const ALLOWED_KEYS = ['id', 'ref_id', 'email'];

export default async (user = { key: 'id', value: null }) => {
  const userObj = { ...user };
  userObj.key = user.key || 'id';
  if (!ALLOWED_KEYS.includes(userObj.key)) {
    const error : { [key: string]: any } = new Error('Invalid user key');
    error.code = 422;
    throw error;
  }
  
  const [userError, userData] = await safePromise(
    findUserByKey(userObj.key, userObj.value)
  );

  if (userError) {
    throw userError;
  }
  
  if (userData) {
    return userCamelCaseToSnakeCase(userData);
  }
  return {};
};
