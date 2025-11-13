import SettingsPageClient from '@/app/components/SettingsPage';
import getApplicationContext from '@/utils/get-context';
import React, { Suspense } from 'react';

export const metadata = {
  title: 'Settings',
  description: '',
};

export default async function SettingsPage() {
  const contextObj = await getApplicationContext();
  const {
    info,
    api_endpoints,
    config,
    user,
  } = contextObj;

  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <SettingsPageClient
        info={info}
        api_endpoints={api_endpoints}
        user={user}
        config={config}
      />
    </Suspense>
  );
}
