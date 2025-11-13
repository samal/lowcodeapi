import Home from '@/app/components/Home';
import getApplicationContext from '@/utils/get-context';
import React, { Suspense } from 'react'; // Import Suspense

export default async function MainPage() {
  const contextObj = await getApplicationContext();
  const {
    info,
    api_endpoints,
    endpoint,
    config,
    providers,
    user
  } = contextObj;

  return (
    <Suspense fallback={<div>Loading...</div>}> {/* Wrap Home in Suspense */} 
      <Home
          info={info}
          endpoint={endpoint}
          api_endpoints={api_endpoints}
          user={user}
          config={config}
          sidebar={config.sidebar}
          apis={[]}
          providers={providers.filter((item) => item.released && !item.testing)}
      />
    </Suspense> 
  );
}
