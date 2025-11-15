import { safePromise } from '../../../../utilities';
import db from '../../db';
import { prisma } from '../../db/prisma';
import { usersUnifiedConfigSnakeCaseToCamelCase, usersUnifiedConfigCamelCaseToSnakeCase } from '../../db/prisma/converters';

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
    const [error, unified_config] = await safePromise(
      prisma.users_unified_config.findFirst({
        where: {
          user_ref_id,
          unified_type,
          active: true,
        },
      }),
    );

    if (error) {
      throw new Error(error);
    }
    // check integration status of the provider
    if (!unified_config) return null;
    const apiConfig = usersUnifiedConfigCamelCaseToSnakeCase(unified_config);
    return {
      user_ref_id: apiConfig.user_ref_id,
      unified_type: apiConfig.unified_type,
      provider: apiConfig.provider,
      active: apiConfig.active,
    };
  },
  addOrUpdate: async ({
    user_ref_id, unified_type, provider, json_config, // eslint-disable-line no-unused-vars
  }: UnifiedSettingsInterface) => {
    const [error, unified_config] = await safePromise(
      prisma.users_unified_config.findFirst({
        where: {
          user_ref_id,
          unified_type,
          active: true,
        },
      }),
    );

    if (error) {
      throw new Error(error);
    }

    // check integration status of the provider, then only proceed.
    if (unified_config) {
      const updateData = usersUnifiedConfigSnakeCaseToCamelCase({ provider });
      const [updateError] = await safePromise(
        prisma.users_unified_config.update({
          where: {
            id: unified_config.id,
          },
          data: updateData,
        }),
      );

      if (updateError) {
        throw new Error(updateError);
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
    const prismaPayload = usersUnifiedConfigSnakeCaseToCamelCase(payload);
    const [error1, unified_config1] = await safePromise(
      prisma.users_unified_config.create({
        data: prismaPayload,
      }),
    );

    if (error1) {
      throw new Error(error1);
    }
    const apiConfig = usersUnifiedConfigCamelCaseToSnakeCase(unified_config1);
    return {
      user_ref_id,
      provider: apiConfig.provider,
      unified_type: apiConfig.unified_type,
      active: 1,
    };
  },
};
