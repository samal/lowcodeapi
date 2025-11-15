import bcrypt from 'bcrypt';
import { modules } from '../../common';
import { safePromise } from '../../../../utilities';
import { prisma } from '../../db/prisma';
import { userSnakeCaseToCamelCase, userCamelCaseToSnakeCase } from '../../db/prisma/converters';

const { generate } = modules;

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

    const prismaData = userSnakeCaseToCamelCase(user);
    const created = await prisma.users.create({ data: prismaData });
    return userCamelCaseToSnakeCase(created);
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

    const updateObj: { [key: string]: any } = { password_hash: new_password_hash };
    const prismaData = userSnakeCaseToCamelCase(updateObj);

    // Find user by ref_id first, then update by id (unique field)
    const existingUser = await prisma.users.findFirst({
      where: { ref_id: user.ref_id },
    });
    
    if (!existingUser) {
      throw new Error('User not found');
    }

    const updated = await prisma.users.update({
      where: { id: existingUser.id },
      data: prismaData,
    });
    return userCamelCaseToSnakeCase(updated);
  },
  changeEmail: async (update: { [key: string]: any }, user: { [key: string]: any }) => {
    const { email } = update;
    const updateObj: { [key: string]: any } = { email };
    delete updateObj.password_hash;
    
    // Find user by ref_id first, then update by id (unique field)
    const existingUser = await prisma.users.findFirst({
      where: { ref_id: user.ref_id },
    });
    
    if (!existingUser) {
      throw new Error('User not found');
    }

    const updated = await prisma.users.update({
      where: { id: existingUser.id },
      data: updateObj,
    });
    return userCamelCaseToSnakeCase(updated);
  },
  update: async (update: { [key: string]: any }, user: { [key: string]: any }) => {
    const {
      first_name, last_name, profile_picture, extra = {}, username,
    } = update;
    const updateObj: { [key: string]: any } = {
      first_name, last_name, profile_picture, extra, username,
    };
    delete updateObj.password_hash;
    
    // Find user by ref_id first, then update by id (unique field)
    const existingUser = await prisma.users.findFirst({
      where: { ref_id: user.ref_id },
    });
    
    if (!existingUser) {
      throw new Error('User not found');
    }

    const prismaData = userSnakeCaseToCamelCase(updateObj);
    const updated = await prisma.users.update({
      where: { id: existingUser.id },
      data: prismaData,
    });
    return userCamelCaseToSnakeCase(updated);
  },
};
