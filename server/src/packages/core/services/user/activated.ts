import { modules } from '../../common';
import { loggerService, safePromise } from '../../../../utilities';
import { prisma } from '../../db/prisma';
import { usersActivatedProvidersSnakeCaseToCamelCase } from '../../db/prisma/converters';

const { generate } = modules;

export default async ({ user, provider, active = 1 }: {[key:string]: any}) => {
  // loggerService.info(user);

  const updateCondition = {
    user_ref_id: user.ref_id,
    provider_ref_id: provider.toLowerCase(),
  };

  // Convert active: 1 to Int for Prisma (active is TinyInt in schema)
  const activeValue = active === 1 || active === true ? 1 : 0;
  const updateObj: {[key:string]: any} = {
    active: activeValue,
  };

  // Try to find existing record first
  const existing = await prisma.users_activated_providers.findFirst({
    where: updateCondition,
  });

  if (existing) {
    // Update existing record
    const [updateError] = await safePromise(
      prisma.users_activated_providers.update({
        where: { id: existing.id },
        data: updateObj,
      })
    );

    if (updateError) {
      const message = 'Error activating or updating the provider';
      loggerService.error(updateError.message, message);
      throw new Error(message);
    }
  } else {
    // Create new record
    const insertPayload: any = {
      ref_id: generate('uap'),
      user_ref_id: user.ref_id,
      provider_ref_id: provider.toLowerCase(),
      active: 1,
    };
    
    const prismaData = usersActivatedProvidersSnakeCaseToCamelCase(insertPayload);
    const [queryError] = await safePromise(
      prisma.users_activated_providers.create({ data: prismaData })
    );

    if (queryError) {
      const message = 'Error activating the provider';
      loggerService.error(queryError, message);
      throw new Error(message);
    }
  }

  return null;
};
