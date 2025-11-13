import LoginPage from '@/app/components/LoginPage';
import getApplicationContext from '@/utils/get-context';
import React, { Suspense } from 'react';
import i18n from '@/static-json/i18n.json'; // Import i18n

export default async function Page() {
  const contextObj = await getApplicationContext();
  const {
    info,
    api_endpoints,
    providers,
    config,
    user
  } = contextObj;

  return (
    <Suspense fallback={<div>Loading login...</div>}>
      <LoginPage
        i18n={i18n.login} 
        info={info}
        api_endpoints={api_endpoints}
        user={user}
        config={config}
        providers={providers.filter((item) => item.released && !item.testing)}
      />
    </Suspense>
  );
}
