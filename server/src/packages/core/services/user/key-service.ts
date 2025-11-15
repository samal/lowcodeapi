import { safePromise } from '../../../../utilities';
import generateUserId from '../../common/id';
import { prisma } from '../../db/prisma';
import { usersApiTokenSnakeCaseToCamelCase, usersApiTokenCamelCaseToSnakeCase } from '../../db/prisma/converters';

export default {
  getAllByUserId: async (user_ref_id: any, options = { extract: false }) => {
    const [tokenError, tokenList] = await safePromise(
      prisma.users_api_tokens.findMany({
        where: {
          user_ref_id,
          active: true,
        },
      })
    );

    if (tokenError) {
      throw new Error(tokenError);
    }
    
    if (options.extract) {
      const token = tokenList[0];
      return token ? usersApiTokenCamelCaseToSnakeCase(token) : null;
    }
    
    const tokenListMapped = tokenList.map((item: any) => {
      const local = usersApiTokenCamelCaseToSnakeCase(item);
      let token = local.api_token.split('_');
      token.shift();
      const suffix = token.length > 1 ? token.pop() : '';
      const first3 = token.join('').slice(0, 4);
      const last4 = token.join('').slice(-4);

      token = token.join('').split('');
      token.shift();
      token.pop();
      token.pop();
      local.api_token = `at-${first3}${token.map(() => '•').join('')}${last4}${suffix ? `_${suffix}` : ''}`;
      return {
        ...local,
        user_ref_id: undefined,
        updatedAt: undefined,
        updated_at: undefined,
        createdAt: undefined,
        id: undefined,
        remark: undefined,
      };
    });
    return tokenListMapped;
  },
  all: async () => [],
  get: async (api_token: string, options: { [key: string]: any } = { service: false, app: {} }) => {
    const where: any = {
      api_token,
      active: true,
    };

    if (options.service) {
      where.service_id = options.app.id;
    }
    
    const [tokenError, tokenObj] = await safePromise(
      prisma.users_api_tokens.findFirst({ where })
    );

    if (tokenError) {
      throw new Error(tokenError);
    }
    
    const tokenData = tokenObj ? usersApiTokenCamelCaseToSnakeCase(tokenObj) : null;
    return tokenData;
  },
  add: async (
    payload: { [key: string]: any },
  ) => {
    const usat: { [key: string]: any } = {
      ref_id: generateUserId('URT'),
      ...payload,
    };
    
    const prismaData = usersApiTokenSnakeCaseToCamelCase(usat);
    const [tokenError, tokenObj] = await safePromise(
      prisma.users_api_tokens.create({ data: prismaData })
    );

    if (tokenError) {
      throw new Error(tokenError);
    }
    
    const tokenData = tokenObj ? usersApiTokenCamelCaseToSnakeCase(tokenObj) : null;
    return tokenData;
  },
  deactivateToken: async (
    { ref_id, user_ref_id }: { [any:string]: any },
  ) => {
    // Find token by ref_id first, then update by id (unique field)
    const existingToken = await prisma.users_api_tokens.findFirst({
      where: {
        ref_id,
        active: true,
      },
    });
    
    if (!existingToken) {
      throw new Error('Token not found or already deactivated');
    }

    const [tokenError, tokenObj] = await safePromise(
      prisma.users_api_tokens.update({
        where: { id: existingToken.id },
        data: {
          active: false,
          remark: `API token deactivated by ${user_ref_id}`,
        },
      })
    );

    if (tokenError) {
      throw new Error(tokenError);
    }
    
    return usersApiTokenCamelCaseToSnakeCase(tokenObj);
  },
  updateLastUsed: async (
    ref_id?: any,
    user_ref_id?: any,
  ) => {
    // Find token by ref_id and user_ref_id first, then update by id (unique field)
    const existingToken = await prisma.users_api_tokens.findFirst({
      where: {
        ref_id,
        user_ref_id,
        active: true,
      },
    });
    
    if (!existingToken) {
      throw new Error('Token not found');
    }

    const [tokenError, tokenObj] = await safePromise(
      prisma.users_api_tokens.update({
        where: { id: existingToken.id },
        data: {
          last_used: new Date(),
        },
      })
    );

    if (tokenError) {
      throw new Error(tokenError);
    }
    
    return usersApiTokenCamelCaseToSnakeCase(tokenObj);
  },
  update: async () => null,
};
