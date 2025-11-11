import bcrypt from 'bcrypt';
import { modules } from '../../common';
import { safePromise } from '../../../../utilities';

import db from '../../db';

const { generate } = modules;

const { User } = db.models;

const bcryptSaltRounds = 10;

export default {
  create: async (body: { [key: string]: any } = {}) => {
    const user: any = { ...body };
    user.email = body.email;
    if (body.password) {
      const salt = await bcrypt.genSalt(bcryptSaltRounds);
      user.password_hash = await bcrypt.hash(body.password, salt);
    }
    user.email_verified = false;
    user.ref_id = generate();

    return User.create(user);
  },
  verifyPassword: async (verify: { [key: string]: any }) => {
    if (!verify.password_hash && verify.password) {
      throw new Error('Invalid varification');
    }
    return bcrypt.compare(verify.password, verify.password_hash);
  },
  changePassword: async (payload: { [key: string]: any }, user: { [key: string]: any }) => {
    if (!payload.password_hash || !payload.password
      || !payload.new_password || !payload.new_password_2) {
      throw new Error('Invalid varification, password field is missing.');
    }
    const [error, matched] = await safePromise(
      bcrypt.compare(payload.password, payload.password_hash),
    );
    if (error || !matched) {
      throw new Error('Invalid varification');
    }

    const salt = await bcrypt.genSalt(bcryptSaltRounds);
    const new_password_hash = await bcrypt.hash(payload.new_password, salt);

    const udpateObj: { [key: string]: any } = { password_hash: new_password_hash };

    return User.update(udpateObj, {
      where: {
        ref_id: user.ref_id,
      },
    });
  },
  changeEmail: async (update: { [key: string]: any }, user: { [key: string]: any }) => {
    const { email } = update;
    const udpateObj: { [key: string]: any } = { email };
    delete udpateObj.password_hash;
    return User.update(udpateObj, {
      where: {
        ref_id: user.ref_id,
      },
    });
  },
  update: async (update: { [key: string]: any }, user: { [key: string]: any }) => {
    const {
      first_name, last_name, profile_picture, extra = {}, username,
    } = update;
    const udpateObj: { [key: string]: any } = {
      first_name, last_name, profile_picture, extra, username,
    };
    delete udpateObj.password_hash;
    return User.update(udpateObj, {
      where: {
        ref_id: user.ref_id,
      },
    });
  },
};
