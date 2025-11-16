import React, { Suspense } from 'react';
import axios from 'axios';
import getApplicationContext from '@/utils/get-context';
import processPath from '@/utils/process-path';
import ExplorerClient from './ExplorerClient';

export async function generateStaticParams() {
    const contextObj = await getApplicationContext();
    const {
        DATA_ENDPOINT,
        providers,
    } = contextObj;

    const providersPath = [];
    let allowedProviders = providers.filter((i) => i);
    
    allowedProviders = allowedProviders.map(async(item) => {
        const provider = item.id;
        providersPath.push({
            provider,
            paths: undefined
        });
        // try {
        //     const resp = await axios(`${DATA_ENDPOINT}/${provider}/metadata`);
        //     const result = resp.data;
        //     const { res: metadata } = result;
        //     if (metadata) {
        //         // Root level keys
        //         const categories = Object.keys(metadata);

        //         categories.forEach((category) => {
        //             const base = metadata[category].id.toString().toLowerCase().trim().replaceAll(' ', '-');
        //             providersPath.push({
        //                 provider,
        //                 paths: [base]
        //             });
        //         })
        //     }
        // } catch (e) {
        //     console.error(`${provider} does not have any other path due to error occurred in metadata fetch`, e);
        // }
    });

    console.log('Waiting for all providers to finish metadata hydration');
    await Promise.all(allowedProviders);

    console.table({ 'total metadata hydrated': providersPath.length});

    return providersPath;
}

export default async function ProviderPage({ params }) {
    const contextObj = await getApplicationContext();
    const {
        DATA_ENDPOINT,
        targetIntentsMap,
        info,
        api_endpoints,
        endpoint,
        providerGroup,
        providers,
        config : configGlobal,
        user
    } = contextObj;

    const { provider, paths: pathsParam } = await params;
    // Handle optional catch-all: pathsParam can be undefined, array, or single string
    const paths = pathsParam 
        ? (Array.isArray(pathsParam) ? pathsParam : [pathsParam])
        : [];

    try {
        const filter = paths.length ? [...paths] : [];
        let qs = 'extra_key=1';
        
        const intents = targetIntentsMap[provider];
        const options = {
            url: `${DATA_ENDPOINT}/${provider}/definition${qs ? `?${qs}`: ''}`, 
            method: intents && intents.length ? "POST": "GET",
            data: { intents },
        }
        console.log('options', options, targetIntentsMap, provider);
        const { data } = await axios(options);
        
        const result = data;

        const config = {
            ...configGlobal,
            sidebar: providers.map(item => {
                return {
                    ...item, 
                    active: item.id === provider,
                }
            }),
            navs: providers,
        }

        let selected = {};

        console.log(`........${provider}.........`, 'ssr');

        if (providers) {
            selected = providers && providers.filter((item) => item.id === provider);
        }
    
        selected = selected[0];

        if (selected && ['unified', 'utilities'].includes(provider)) {
            selected.ignore = true;
            selected.aiEnabled = false;
            selected.title = info.title
        } else if (!selected) {
            selected = {
                title: info.title
            }
        }

        if (info.DISABLE_FEATURE) {
            selected.title = info.title;
        }
        if (!selected.id) {
            throw `Selected object is empty for '${provider}'`;
        }

        const definition = processPath(result, provider, filter, selected);

        //patching api_endpoint for static build
        if (endpoint.api_endpoint && info.SKIP_PROVIDER_BASE_PATH) {
            definition.details.service_url = `${endpoint.api_endpoint}`;
        } else if (endpoint.api_endpoint) {
            definition.details.service_url = `${endpoint.api_endpoint}/${provider}`;
        } else {
            definition.details.service_url = '';
        }

        const pageProps = { 
            providerGroup,
            providers: providers.filter((item) => item.released && !item.testing),
            breadcrumbs: definition.breadcrumbs,
            definition: {
                ...definition,
                details: {
                    ...definition.details,
                    ...selected,
                }
            }, 
            config, 
            user,
            sidebar: config.sidebar,
            selected,
            endpoint,
            api_endpoints,
            info
        };

        return (
            <Suspense fallback={<div>Loading...</div>}>
                <ExplorerClient {...pageProps} />
            </Suspense>
        );
    } catch (err) {
        console.log(err);
        throw err;
    }
}

