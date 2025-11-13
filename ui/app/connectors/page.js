import ConnectorsPageClient from '@/app/components/ConnectorsPage';
import getApplicationContext from '@/utils/get-context';
import React, { Suspense } from 'react';

export const metadata = {
  title: 'Connectors',
  description: '',
};

export default async function ConnectorsPage() {
  const contextObj = await getApplicationContext();
  const {
    info,
    api_endpoints,
    config,
    user,
    providers,
    categories,
    categoryIndex,
  } = contextObj;

  const releasedProviders = providers.filter((item) => item.released && !item.testing);
  const upcomingProviders = providers.filter((item) => !item.released);
  const tbaProviders = providers.filter((item) => item.testing);

  const allCategories = [`All`, ...categories];

  return (
    <Suspense fallback={<div>Loading connectors...</div>}>
      <ConnectorsPageClient
        info={info}
        api_endpoints={api_endpoints}
        user={user}
        config={config}
        sidebar={config.sidebar}
        providers={releasedProviders}
        upcoming={upcomingProviders}
        tba={tbaProviders}
        categories={allCategories}
        categoryIndex={categoryIndex}
      />
    </Suspense>
  );
}
