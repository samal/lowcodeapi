import { safePromise } from '../../../../utilities';
import db from '../../db';

const { UsersUnifiedConfig } = db.models;

interface UnifiedSettingsInterface {
    // user_ref_id: string,
    // unified_type: string,
    // provider: string,
    // json_config: {
    //     [key: string]: any
    // }
    [key: string]: any
}

export default {
  get: async ({ user_ref_id, unified_type } : UnifiedSettingsInterface) => {
    const [error, unified_config] = await safePromise(UsersUnifiedConfig.findOne({
      where: {
        user_ref_id,
        unified_type,
        active: true,
      },
    }));

    if (error) {
      throw new Error(error);
    }
    // check integration status of the provider
    if (!unified_config) return null;
    return {
      user_ref_id: unified_config.user_ref_id,
      unified_type: unified_config.unified_type,
      provider: unified_config.provider,
      active: unified_config.active,
    };
  },
  addOrUpdate: async ({
    user_ref_id, unified_type, provider, json_config, // eslint-disable-line no-unused-vars
  }: UnifiedSettingsInterface) => {
    const [error, unified_config] = await safePromise(UsersUnifiedConfig.findOne({
      where: {
        user_ref_id,
        unified_type,
        active: true,
      },
    }));

    if (error) {
      throw new Error(error);
    }

    // check integration status of the provider, then only proceed.
    if (unified_config) {
      const [error] = await safePromise(UsersUnifiedConfig.update({
        provider,
      }, {
        where: {
          user_ref_id,
          unified_type,
          active: true,
        },
      }));

      if (error) {
        throw new Error(error);
      }
      return {
        user_ref_id,
        provider,
        unified_type,
        active: 1,
      };
    }
    const payload : any = {
      user_ref_id,
      unified_type,
      provider,
      active: true,
    };
    const [error1, unified_config1] = await safePromise(UsersUnifiedConfig.create(payload));

    if (error1) {
      throw new Error(error1);
    }
    return {
      user_ref_id,
      provider: unified_config1.provider,
      unified_type: unified_config1.unified_type,
      active: 1,
    };
  },
};
