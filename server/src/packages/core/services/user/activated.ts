import { modules } from '../../common';
import { loggerService, safePromise } from '../../../../utilities';
import db from '../../db';

const { generate } = modules;

const { UsersActivatedProviders } = db.models;

export default async ({ user, provider, active = 1 }: {[key:string]: any}) => {
  // loggerService.info(user);

  const updateObj: {[key:string]: any} = {
    active,
  };

  const updateCondition = {
    user_ref_id: user.ref_id,
    provider_ref_id: provider.toLowerCase(),
  };

  const [updateError, update] = await safePromise(UsersActivatedProviders.update(updateObj, {
    where: updateCondition,
  }));

  if (updateError) {
    const message = 'Error activating or updating the provider';
    loggerService.error(updateError.message, message);
    throw new Error(message);
  }

  if (!update || !update[0]) {
    const insertPayload: any = {
      ref_id: generate('uap'),
      user_ref_id: user.ref_id,
      provider_ref_id: provider.toLowerCase(),
      active: 1,
    };
    // loggerService.info('insert', insertPayload);

    const [queryError] = await safePromise(UsersActivatedProviders.create(insertPayload));

    if (queryError) {
      const message = 'Error activating the provider';
      loggerService.error(queryError, message);
      throw new Error(message);
    }
  }

  return null;
};
