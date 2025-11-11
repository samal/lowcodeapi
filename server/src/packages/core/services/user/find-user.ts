import { safePromise } from '../../../../utilities';
import db from '../../db';

const { User } = db.models;

const ALLOWED_KEYS = ['id', 'ref_id', 'email'];

export default async (user = { key: 'id', value: null }) => {
  const userObj = { ...user };
  userObj.key = user.key || 'id';
  if (!ALLOWED_KEYS.includes(userObj.key)) {
    const error : { [key: string]: any } = new Error('Invalid user key');
    error.code = 422;
    throw error;
  }
  const [userError, userData] = await safePromise(User.findOne({
    where: {
      [userObj.key]: userObj.value,
    },
  }));

  if (userError) {
    throw userError;
  }
  if (userData) {
    return userData.toJSON();
  }
  return {};
};
