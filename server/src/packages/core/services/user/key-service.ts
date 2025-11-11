import { safePromise } from '../../../../utilities';
import generateUserId from '../../common/id';
import db from '../../db';

const { UsersAPIToken } = db.models;

export default {
  getAllByUserId: async (user_ref_id: any, options = { extract: false }) => {
    const [tokenError, tokenList] = await safePromise(UsersAPIToken.findAll({
      where: {
        user_ref_id,
        active: true,
      },
    }));

    if (tokenError) {
      throw new Error(tokenError);
    }
    if (options.extract) {
      const token = tokenList[0];
      return token;
    }
    const tokenListMapped = tokenList.map((item: any) => {
      const local = item.toJSON();
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
    const selectedModel: any = UsersAPIToken;
    const find: { [key: string]: any } = {
      where: {
        api_token,
        active: true,
      },
    };

    if (options.service) {
      find.where.service_id = options.app.id;
    }
    const [tokenError, tokenObj] = await safePromise(selectedModel.findOne(find));

    if (tokenError) {
      throw new Error(tokenError);
    }
    const tokenData = tokenObj && tokenObj.toJSON();
    return tokenData;
  },
  add: async (
    payload: { [key: string]: any },
  ) => {
    const usat: { [key: string]: any } = {
      ref_id: generateUserId('URT'),
      ...payload,
    };
    const selectedModel: any = UsersAPIToken;
    const [tokenError, tokenObj] = await safePromise(selectedModel.create(usat));

    if (tokenError) {
      throw new Error(tokenError);
    }
    const tokenData = tokenObj && tokenObj.toJSON();
    return tokenData;
  },
  deactivateToken: async (
    { ref_id, user_ref_id }: { [any:string]: any },
  ) => {
    const selectedModel: any = UsersAPIToken;
    const [tokenError, tokenObj] = await safePromise(selectedModel.update({
      active: false,
      remark: `API token deactivated by ${user_ref_id}`,
    }, {
      where: {
        ref_id,
        active: true,
      },
    }));

    if (tokenError) {
      throw new Error(tokenError);
    }
    return tokenObj;
  },
  updateLastUsed: async (
    ref_id?: any,
    user_ref_id?: any,
  ) => {
    const selectedModel: any = UsersAPIToken;
    const [tokenError, tokenObj] = await safePromise(selectedModel.update({
      last_used: new Date(),
    }, {
      where: {
        ref_id,
        user_ref_id,
        active: true,
      },
    }));

    if (tokenError) {
      throw new Error(tokenError);
    }
    return tokenObj;
  },
  update: async () => null,
};
