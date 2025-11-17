"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import queryString from 'query-string';
import axios from 'axios';

import apiFetch from '@/utils/request';
import { isAuthenticated } from '@/utils/auth';

import SEO from '@/components/seo';

import Layout from '@/components/EditorLayout';
import ExplorerViewNew from '@/components/ExplorerView';
import APIRequestLogs from '@/components/ExplorerView/APIRequestLogs';
import APIResponse from '@/components/ExplorerView/APIResponse';
import ProviderSetup from '@/components/ExplorerView/Configure';
import EditorCanvas from '@/components/EditorCanvas';

import { IntentTab , ConnectorSteps, ConnectorStatus, IntentHead } from '@/components/ProviderPage';

import providerTabs from '@/static-json/provider-tabs.json';

import i18nText from '@/static-json/i18n.json';
import IconPack from '@/components/IconPack';

const { customTabs, defaultTabs } = providerTabs;

export default function ExplorerClient({ 
    info = {},
    api_endpoints = {},
    providerGroup,
    selected, definition = {}, user: userSession, config:configProps,
    breadcrumbs: defaultBreadcrumbs,
    endpoint = {}
}) {
    const { name } = info;
    const {
        BASE_API,
        INTEGRATIONS_API,
        APP_CONFIG_API,
        METRICS_API,
        REQUEST_LOGS_API,
    } = api_endpoints;
    
    // App Router: use useParams and useSearchParams instead of useRouter
    const params = useParams();
    const searchParams = useSearchParams();
    
    // Extract provider and paths from params
    const provider = params.provider;

    
    // Extract query parameters from searchParams
    const providersall = searchParams.get('providersall');
    const providers = searchParams.get('providers');
    const id = searchParams.get('id');
    const tab = searchParams.get('tab');
    const category = searchParams.get('category');
    const categories = searchParams.get('categories');
    const categoriesall = searchParams.get('categoriesall');
    const path = searchParams.get('path');
    
    const image = `${endpoint.ui_base}/og/${provider}.jpeg`;
    const favicon = `${endpoint.ui_base}${endpoint.logo_base}/${provider}.svg`;

    const system = {
        auth_url: endpoint.ui_domain,
        openai_url: `${endpoint.api_endpoint}/openai/v1/chat/completions`,
    }

    const [i18n] = useState(i18nText);
    const [config, setConfig] = useState({
        ...configProps,
    });

    const [data, setData] = useState({
        breadcrumbs: defaultBreadcrumbs,
        apiList: definition.apiList || {} , 
        details: definition.details || {},
        category: definition.category || {},
        total: definition.total || 0,
        error: null
    });

    const [ permaCategory, setPermaCategory ] = useState({});
    const [codeView, setCodeView] = useState(false);
    const [renderingWait, setRenderingWait] = useState(false);  
    const [user, setUser] = useState({ ...userSession });
    const [tabs, setTabs] = useState(defaultTabs[0]); 
    const [connections, setConnections] = useState([]); 
    const [aiEnabled] = useState(false);
    const [hideAi] = useState(false);
    const [converterTitle, setConverterTitle] = useState(selected.name);
    const [tabView, setTabView] = useState('apis'); //
    const [groupTab, setGrouptab] = useState(() => id ? 'custom' : (tab? tab : 'official'));
    const [submitLock, setSubmitLock] = useState(false);
    const [error, setError] = useState(''); //
    const [intentAction, setIntentAction] = useState({});
    const [providersAll, setProvidersAll] = useState([]);
    const [status, setStatus] = useState({
        wait: true,
        message: '',
        target: '',
    });
    const [details, setDetails] = useState({
        api_count_limit: 100,
        api_token: user.api_token,
        ...definition.details,
        integrated_wait: true,
        authorized_wait: true,
        credential_link: selected.credential_link
    });

    const [imgFallback, setImgFallback] = useState({}); 
    const [setupView, setSetupView] = useState(null);
    const [currentView, setCurrentView] = useState({});
    const [currentViewHydrationPayload, setCurrentViewHydrationPayload] = useState({});
    const [cachedPayload, setCachePayload] = useState({});
    const [providerIntentMetrics, setProviderIntentMetrics] = useState({ });
    const [requestLogsMap, setRequestLogsMap] = useState({});
    const [apiViewList, setApiViewList] = useState([]);

    const [requestWait, setRequestWait] = useState(false);

    const [intentResponseData, setIntentResponseData] = useState({
        data: null,
        status: '',
        statusText: null,
        headers: { },
        size: 0,
    });
    const [responseView, setResponseView] = useState({
        type: 'response',
        display: {}
    });

    
    //sidebar
    useEffect(() => {
        (async () => {
            let sidebarList = [];
        
            const result = await apiFetch(`${APP_CONFIG_API}/config`, {}).catch((error) => ({ error }));
            let user = null;
            
            const localConfig = { ...result.res, disable: configProps.disable };
            if (isAuthenticated()) {
                try {
                    const resp = await apiFetch(`${APP_CONFIG_API}/user-state`, {});
                    user = resp.res;
            
                    if (!user) return setError('Some error getting the details');

                    //activated providers
                    const url = (!user || !user.registration_completed)  ? `${INTEGRATIONS_API}` : `${INTEGRATIONS_API}/providers?filter=0`;
                    const { res: providers } = await apiFetch(url, {});
            
                    let processedNavs = sidebarList.map(item => {
                        let localN = {
                            ...item, 
                            active: item.id === provider,
                        }

                        if (user && (user.registration_completed || user.name)) {
                            localN.allowed = (item.paid_service && user.subscription_active) ? true : false;
                            localN.integration = providers[item.id];
                        }
                        return localN;
                    }); 
                    localConfig.navs = processedNavs;
                    let list = [];
                    providersAll.forEach( item => {
                        list = list.concat(item.list);
                    });
                    list = list.map(i => i.id);

                    const localconnections = providers.filter(item => {
                        if (item.activated) {
                            return list.includes(item.provider_key);
                        }
                        return false;
                    });
                    setConfig(localConfig);
                    setConnections([ ...localconnections ]);
                    setUser(user);
                    setStatus({
                        ...status,
                        wait: false,
                    });
                    try {
                        const localCachePayload = localStorage.getItem(`${user.user_ref_id}_payload_cache`);
                        setCachePayload({...JSON.parse(localCachePayload) });
                    } catch (e) {
                        console.error(e);
                    }
                } catch (e) {
                    console.error('Error', e);
                    const processedNavs = sidebarList.map(item => {
                        return {
                            ...item, 
                            active: item.id === provider,
                        };
                    });  
                    localConfig.navs = processedNavs
                    setConfig(localConfig);
                    setUser({
                        guest: true,
                    });
                }
            } else {
                setConfig(localConfig);
                setUser({
                    guest: true,
                });
                setStatus({
                    ...status,
                    wait: false,
                });
            }
        })();
    }, []);
    
    useEffect(() => {

        if (providersall) {
            setProvidersAll([ ...providerGroup ]);
        } else if (providers) {
            const filterProviders = providers.trim().split(',').map(i => i.trim());
            const lpg = providerGroup.map(item => {
                const local = { ...item };
                let list = [ ...local.list ];
    
                list = list.filter(i => {
                    return filterProviders.includes(i.id) || i.id === provider;
                });
                local.list = list;
                return local;
            });
            setProvidersAll([ ...lpg ]);
        } else if (provider) {
            const lpg = providerGroup.map(item => {
                const local = { ...item };
                let list = [ ...local.list ];
                const providerCheck = provider.trim().split(',').map(i => i.trim());
                list = list.filter(i => {
                    return providerCheck.includes(i.id);
                });
                local.list = list;
                return local;
            });
            setProvidersAll([ ...lpg ]);
        }
    }, [provider, providers, providersall]);

    useEffect(() => {        
        const cat = {};
        if (categoriesall) {
            cat.all = true;
        } else if (categories) {
            cat.list = (categories || category).trim().toLowerCase().split(',');
        } else if (category) {
            cat.list = [category.trim().toLowerCase()];
        } else if (providers) {
            console.log(providers);
            cat.providers = providers.trim().split(',');
        }
        setPermaCategory(cat);

    }, [category, categories, categoriesall, providers]);
    
    useEffect(() => {
        setConverterTitle(selected.name);
        if (provider) {
            setGrouptab('');
            setTabView('apis');
            if(id) {
                setGrouptab(tab);
            }

        }
    }, [provider]);
    
    useEffect(() => {
        if (!provider || !user.name) {
            const localDetail = { ...details, credential_link: selected.credential_link, integrated_wait: false, authorized_wait: false };
            setDetails({ ...localDetail });
            return;
        };

        if (customTabs[provider] && user.name) {
            const localTabs = [defaultTabs[0], ...customTabs[provider]];
            setTabs(localTabs); 
        } else {
            setTabs([defaultTabs[0]]);
        }
        ;(async () => {
            const selectedProvider =  config.navs.filter((item) => item.id === provider);   
            let localDetail = { ...details, auth_type: null, provider_link: null, };

            if (selectedProvider.length) {
                localDetail = {
                    ...localDetail,
                    ...selectedProvider[0],
                }
                if (localDetail.auth_config && localDetail.auth_config.auth_link) {
                    localDetail.connectLink = localDetail.auth_config.auth_link;
                } else {
                    localDetail.connectLink = null;
                }
            }

            try {
                const integration = selected && selected.integration_map ? selected.integration_map : provider;
                const result = await apiFetch(`${INTEGRATIONS_API}/${integration}?check=1`, {
                    method: 'GET'
                },{
                    skip: true
                })
                const data = result.res;
                localDetail.integrated = !!data.activated;
                localDetail.integrated_wait = false;
                localDetail.authorized = data.authorized;
                localDetail.authorized_wait = false;
                localDetail.credential_found = data.credential_found;
                localDetail.credentials = data.credential_found;
                localDetail.masked_credentials = { ...data[selected.id], selected_scopes: undefined};
                if (data[selected.id] && data[selected.id].selected_scopes) {
                    localDetail.used_scopes = data[selected.id].selected_scopes;
                } else {
                    localDetail.used_scopes = null;
                }
                localDetail.system_creds = data.system_creds;
                const { scope } = data.auth_config ? data.auth_config : { };
                let provider_config = data.auth_config ? (data.auth_config.setup ? data.auth_config.setup : data.auth_config) : [];
                if (data.auth_type === 'OAUTH2.0' && scope) {
                    provider_config = provider_config.filter(input => input.name !== 'selected_scopes');
                    const input = {
                        name : "selected_scopes",
                        className: "",
                        field : "multiSelect",
                        label : "OAuth2.0 Scope",
                        message : `Add comma seperated scopes for accessing ${selected.name}'s api endpoints`,
                        placeholder : `Add comma seperated scopes for accessing ${selected.name}'s api endpoints`,
                        type: "enum",
                        dropdownList: scope.map(item => ({
                            key: item.name,
                            value: item.name,
                            label: item.label || item.name
                        }))
                    }
                    provider_config.push(input);
                }

                localDetail.provider_config = provider_config;
                if (!definition.details.service_url && typeof window !== 'undefined') {
                    const service_url = `${window.location.protocol}//${window.location.host}/${provider}`; 
                    localDetail.service_url = service_url;
                }
                if (data.auth_config && data.auth_config.auth_link) {
                    localDetail.connectLink = data.auth_config.auth_link;
                } else {
                    localDetail.connectLink = null;
                }

                localDetail.credential_link = selected.credential_link || selected.provider_link;
                
                setDetails({ ...localDetail });
            } catch(e) {
                console.log("[FYI Info only] - Integration status check failed.",e.message);
                localDetail.integrated = false
                if (!definition.details.service_url && typeof window !== 'undefined') {
                    const service_url = `${window.location.protocol}//${window.location.host}/${provider}`; 
                    localDetail.service_url = service_url;
                }
                setDetails({ ...localDetail })
            }
        })();
    }, [provider, user]);

    useEffect(() => {
        if (!provider) return;
        const details = {
            ...definition.details
        }
        if (!definition.details.service_url && typeof window !== 'undefined') {
            const service_url = `${window.location.protocol}//${window.location.host}/${provider}`; 
            details.service_url = service_url;
        }

        setData({
            apiList: definition.apiList || [] , 
            details,
            category: definition.category || {},
            total: definition.total || 0,
            error: null
        });
    }, [provider]);
    
    useEffect(() => {
        if (data.apiList) {
            const keys = Object.keys(data.apiList);
            if (keys.length && data.apiList[keys[0]] && data.apiList[keys[0]].length) {
                let list = data.apiList[keys[0]];
                let apisFromKeys = [];
                keys.map((key) => {
                    if (data.apiList[key] && data.apiList[key].length) {
                        const apisFromKey = data.apiList[key];
                        apisFromKeys = apisFromKeys.concat([ ...apisFromKey]);
                    }
                });
                let defaultView = null;
                let fList = [];
                if (category && apisFromKeys.length) {
                    fList = apisFromKeys.filter((item) => item.tags.join('').toLowerCase() === category.toLowerCase());
                    defaultView = fList[0];
                }
                if (path) {
                    fList = apisFromKeys.filter((item) => item.route_name === path);
                    defaultView = fList[0];
                }

                if (!path && !defaultView) {
                    defaultView = list[0];
                }

                if (!fList.length) {
                    fList = apisFromKeys
                }

                setCurrentView(defaultView);
                setApiViewList([...fList]);  
                setSetupView('apis');
            }
        }
    }, [data.apiList, path, category]);

    useEffect(() => {
        ;(async () => {
            if (!currentView || !currentView.hash) return;
            if (isAuthenticated()) {
                const { method, route_name: intent, hash } = currentView;
                try {
                    const qs1 = queryString.stringify({ mode: 'fav', method, provider,  intent });
                    const fav = await apiFetch(`${BASE_API}/intent?${qs1}`, {}).catch((error) => ({ error }));
                    setIntentAction({
                        ...intentAction,
                        [hash]: {
                            fav: !!fav.results,
                        } 
                    });
                } catch(e) {
                    console.log(e);
                }

                const providersForMetrics = [ provider ];

                if (providers && providers.trim()) {
                    const list = providers.trim().split(',').map(i => i.trim());
                    providersForMetrics.push(...list);
                }
                
                let localProviderIntentMetrics = {
                    ...providerIntentMetrics,
                };
                for (let i = 0; i < providersForMetrics.length; i++) {
                    const p = providersForMetrics[i];
                    console.log(p);
                    try {
                        const qs = queryString.stringify({ method, provider: p,  intent });
                        const resp = await apiFetch(`${METRICS_API}?${qs}`, {}).catch((error) => ({ error }));
                        if (resp.results) {
                            const { data } = resp.results;
                            localProviderIntentMetrics = {
                                ...localProviderIntentMetrics,
                                [p]: data[p]
                            };
                        }
                    } catch(e) {
                        console.log(e);
                    }
                }
                setProviderIntentMetrics({
                    ...localProviderIntentMetrics,
                });

                setRenderingWait(false);
            }
            setRenderingWait(false);
        })();
    }, [currentView?.hash, providers]);

    const onError = (e, provider) => {
        const lf = { ...imgFallback };
        lf[provider] = 'lowcodeapi';
        setImgFallback({ ...lf });
    }    

    const onClickSetCurrentView = (view, { pushView = true} = { }) => {
        if (renderingWait) return;
        if (view && view.hash !== currentView.hash) {
            setRenderingWait(true);
            setSetupView('apis');

            setCurrentView(view);

            // Udpate to this to hash view.
            setIntentResponseData({
                data: null,
                error:{
                    
                },
                status : null,
                statusText: '',
                headers: { },
            });

            // Udpate to this to hash view.
            setResponseView({ type:'response', display: {} });

            if (pushView) {
                let localList = [ ...apiViewList ];
                const filter = localList.filter((item, index) => {
                    if (item.summary !== view.summary){
                        item.selected = false;
                        return true;
                    };
                });
        
                setApiViewList([...localList]);
            }
            setRenderingWait(false);
        } 
    };
    const onClickTab = (view) => {
        onClickSetCurrentView(view, { pushView: false});
    }

    const onChangeCachePayload = (payload) => {
        let localCachePayload = { ...cachedPayload };

        if (localCachePayload[provider]) {
            localCachePayload[provider] = {
                ...localCachePayload[provider],
                [currentView.hash]: payload
            };
        } else {
            localCachePayload[provider] = {
                [currentView.hash]: payload
            };
        }
        setCachePayload({...localCachePayload });
        if (user && user.user_ref_id) {
            try {
                localStorage.setItem(`${user.user_ref_id}_payload_cache`, JSON.stringify(localCachePayload));
            } catch (e) {
                console.error(e);
            }
        }
    }
    const onClickRequestLogs = async(view) => {
        if (info.BUILD_FOR_USER) return; // not fetching in custom build mode.
        if (isAuthenticated()) {
            const { hash, method, route_name:intent} = view;
            try {
                const url = `${REQUEST_LOGS_API}?method=${method}&provider=${provider}&path=${intent}`
                const resp = await apiFetch(url, {});
                if (resp && resp.results) {
                    const { list } = resp.results;
                    const localRequestLogsMap = { ...requestLogsMap};
                    localRequestLogsMap[hash] = list;
                    setRequestLogsMap({
                        ...localRequestLogsMap
                    });
                }
    
            } catch(e) {
                console.log(e);
            }   
        }
    }
    const onCloseTab = (view) => {
        const localList = [...apiViewList].filter(item => item.hash !== view.hash);
        setApiViewList([...localList]); 
    }
    const onClickSetup = (view) => {
        setCurrentView(view);
        setSetupView('setup');
    }

    const onCodeView = () => {
        setCodeView(!codeView);
    }
    const onClickGetHydrationData = async() => {
        /// get hydration data

        if (!user || !user.name) {
            return;
        }
        const { method, route_name: intent, hash } = currentView;
        try {
            const qs1 = queryString.stringify({ method, provider, intent });
            const resp = await apiFetch(`${BASE_API}/intent/hydrate?${qs1}`, {});

            const { hydrate_from } = resp.results || {};
            const localProviderIntentHydration = {
                ...(currentViewHydrationPayload[provider] || {}),
                [hash]: hydrate_from
            } 

            const lacalHydrationInstance = { 
                ...currentViewHydrationPayload, 
                [provider]: localProviderIntentHydration 
            }; 
            setCurrentViewHydrationPayload({ ...lacalHydrationInstance });
        } catch(e) {
            console.log(e);
        }
    }
    const onConfigSubmit = async (payload) => {
        const body = {
            provider,
            config: payload
        };

        const url = `${INTEGRATIONS_API}/providers`;

        try {
            setSubmitLock(true);
            await apiFetch(url, {
                method: "POST",
                body,
            });
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        } catch (e) {
            setSubmitLock(false);
            console.error('Error saving provider details', e);
        }
    }

    const onDeleteCredential = async (provider) => {
        const body = {
            provider,
        };

        const url = `${INTEGRATIONS_API}/${provider}`;

        try {
            setSubmitLock(true);
            await apiFetch(url, {
                method: "DELETE",
                body,
            });
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        } catch (e) {
            setSubmitLock(false);
            console.error('Error saving provider details', e);
        }
    }

    const saveUsersIntentPayload = async({ body, query_params, path_params, headers }) => {
        const payload = {
            provider,
            intent: currentView.route_name,
            method: currentView.method,
            body, 
            query_params, 
            path_params,
            headers
        };

        const url = `${BASE_API}/intent/hydrate`;

        try {
            setSubmitLock(true);
            await apiFetch(url, {
                method: "POST",
                body: payload,
            });

        } catch (e) {
            setSubmitLock(false);
            console.error('Error saving intent payload', e);
        }
    }

    const onSaveIntentAction = async (action) => {
        setIntentAction({ ...action });
    }
    const onDeleteIntentAction = async(action) => {
        setIntentAction({ ...action });
    }

    const onClickTryIntentEndpoint = (params) => {
        setRequestWait(true);
        const statusCodeMap = {
            '200': 'OK',
            '500': 'Internal Server Error',
            '401': 'Unauthorized',
            '422': 'Unprocessable Entiry',
        };
        // Clear the response view
        axios(params)
            .then((response) => {
                const { data, status, statusText, headers } = response;
                const contentSize = +headers['content-length'] || 0;
                let size = '';
        
                if (contentSize) {
                contentSize > 1023
                    ? `${parseInt(contentSize / 1024, 10)} KB`
                    : `${contentSize} Bytes`;
        
                }
        
                if (!size) {
                try {
                    size = new TextEncoder().encode(JSON.stringify(data)).length
                    size = `${parseInt(size / 1024, 10)} KB`
                } catch (e) {
        
                }
                }
                console.log(data, params, headers);
                const headersObj = data.result && data.result.headers ? data.result.headers : (data.response_headers ? data.response_headers : headers);
                setIntentResponseData({
                    data,
                    status,
                    statusText: statusCodeMap[status] || statusText,
                    headers: { ...headersObj },
                    size,
                });
        
                setResponseView({ type:'response', display: data });
        
                setTimeout(() => {
                    // UI Feedback improvement.
                    setRequestWait(false);
                }, 200);
        
            })
            .catch(function(error) {
                console.log(error);
                const { data, status, statusText, headers } = error.response
                setIntentResponseData({
                    data: {},
                    error:{
                        status,
                        message: data.message || statusText,
                        ...data
                    },
                    status,
                    statusText: statusCodeMap[status] || statusText,
                    headers: { ...(data.headers || headers)},
                });
                setResponseView({type:'error' , display: {
                    status,
                    message: data.message || statusText,
                    ...data
                }});
                setRequestWait(false);
            });
    };
    const product_name = name;
    let title = selected ? ((selected.title ? selected.title : `Pre-configured ${selected.name}'s API via ${info.name}`) || `Explore and use ${selected.name} API using Low code API interface`) : product_name;

    if (user && user.name) {
        title = `${selected.name} ${!!(details.integrated || details.authorized)? '(Connected)': `${details.credential_found ? '(Authorization Pending)': `(Configure API Credentials)`}`}`
    }

    return (
        <Layout info={info} navs={config.navs} user={user} cover={image} provider={provider} selected={selected} config={config} show={false} endpoints={api_endpoints}>
            {
                selected ?
                    <SEO 
                        info={info}
                        scale={false}
                        title={`${selected.name} - LowCodeAPI`}
                        ogDescription={`Pre-configured, Predictable, Ready to use, Single Interface, Opinionated & Managed ${selected.name}'s API Explorer & Server. Bring your ${selected.name}'s API credential, configure and easily access APIs. Using LowCodeAPI securely manage ${selected.name} integration along with others in one place.`}
                        keywords={`${selected.name} APIs, Pre-configured ${selected.name} APIs, APIs, ${selected.name} Integrations, ${selected.name} Low Code API Integrations, Single Interface, Unified`}
                        favicon={favicon}
                        image={`${image}`}
                    /> : null
            }
            <EditorCanvas 
                user={user}
                config={config}
                integrated={ !!(details.integrated || details.authorized)}
                activeView={setupView}
                info={info}
                providers={providerGroup[0].list}
                providersAll={providersAll}
                metrics={providerIntentMetrics}
                api_endpoints={{...api_endpoints, SERVICE_URL: details.service_url}}
                selected={selected}
                permaCategory={permaCategory}
                apiList={data.apiList}
                currentView={currentView}
                activePath={path}
                setView={setSetupView}
                onClickSetCurrentView={onClickSetCurrentView}
                onCodeView={onCodeView}
                codeView={codeView}
            >
                <>
                    {currentView ?
                        <>
                            <div className='p-4 md:pt-0  pb-2 bg-gray-50'>
                                <div className='grid grid-cols-10 gap-2'>
                                    <div className={`${user && user.name ? 'col-span-10' : 'col-span-10'} overflow-x-scroll `}>
                                        <div className='flex items-center border-b border-gray-100 overflow-scroll'>
                                        {
                                            apiViewList.map((item) => (
                                                <IntentTab 
                                                    key={item.summary}
                                                    selected={selected}
                                                    method={item ? item.method : ''}
                                                    renderingWait={renderingWait}
                                                    view={item}
                                                    title={item ? item.summary : ''}
                                                    provider={provider}
                                                    tabView={currentView} 
                                                    user={user}
                                                    pending={!(details.integrated || details.credentials || details.system_creds)}
                                                    imgFallback={imgFallback}
                                                    onError={onError}
                                                    onClickTab={onClickTab}
                                                    onClose={onCloseTab}
                                                />                                            
                                            ))
                                        }
                                        </div>
                                    </div>
                                    {/* {
                                    !(user && user.name) ? <div className='col-span-2 flex justify-end items-center'>
                                        <div className='w-40 text-xs text-gray-600 p-1 bg-gray-600/30 rounded-md'>
                                        <a href={`${endpoint.ENDPOINT}/auth/google`} className="w-full flex items-center justify-center p-1 pr-3 pl-1 bg-white border border-gray-300 rounded-md">
                                            <img src={`https://assets.lowcodeapi.com/connectors/logos/google.svg`} className="w-4 h-4" alt={`Authenticate with Google`}  />
                                            <span className='ml-1 text-gray-600 font-semibold'>Sign in with Google</span>
                                        </a>
                                        </div>
                                    </div>: null
                                    } */}
                                </div>
                            </div>
                            <div className='relative'>
                                { renderingWait? <div className='absolute z-20 inset-0 bg-gray-100/80 top-0 left-0 right-0 bottom-0'></div> : null}
                                <IntentHead
                                    userAuthorized={user && user.name}
                                    selected={selected}
                                    view={currentView}
                                    activeCategory={category}
                                    activePath={path}
                                    bookmark={true}
                                    metrics={providerIntentMetrics}
                                    api_endpoints={api_endpoints}
                                    imgFallback={imgFallback}
                                    onError={onError}
                                    onClickTab={onClickTab}
                                    intentAction={intentAction}
                                    onSaveAction={onSaveIntentAction}
                                    onDeleteAction={onDeleteIntentAction}
                                >
                                {
                                    (config.disable && config.disable.login) ?
                                        <ConnectorStatus
                                            wait={status.wait || details.integrated_wait || details.authorized_wait}
                                            endpoint={endpoint}
                                            selected={selected}
                                            user= {!!user.name}
                                            details={details}
                                            imgFallback={imgFallback}
                                            setConfigurationView={setSetupView}
                                        /> 
                                    : 
                                    null
                                    }
                                </IntentHead>
                                <div className='flex-grow overflow-scroll h-lvh p-4 py-2 pt-0 bg-gray-50'>
                                    <ExplorerViewNew
                                        i18n={i18n}
                                        api={currentView}
                                        hydration_map={currentViewHydrationPayload[provider] ? currentViewHydrationPayload[provider][currentView.hash] : {}}
                                        cachedPayload={cachedPayload[provider] ? cachedPayload[provider][currentView.hash] : {}}
                                        onChangeCachePayload={onChangeCachePayload}
                                        codeView={codeView}
                                        saveAllowed={user && user.name && !!(details.integrated || details.authorized)}
                                        system={{ ...system, hideAi, aiEnabled, }}
                                        requestWait={requestWait}
                                        details={{
                                            breadcrumbs: data.breadcrumbs,
                                            ...data.details, 
                                            provider,
                                            system_creds: details.system_creds,
                                            ready: !!(details.integrated || details.authorized), 
                                            total:data.total, 
                                            api_token: user.api_token, 
                                            user: !!user.name,
                                            api_security: null,
                                            ignore: (selected && selected.ignore) || !!info.IS_PUBLIC_API,
                                            is_public_api: !!info.IS_PUBLIC_API
                                        }}
                                        setConfigurationView={setSetupView}
                                        saveUsersIntentPayload={saveUsersIntentPayload}
                                        getHydrationData={onClickGetHydrationData}
                                        onClickTryIntentEndpoint={onClickTryIntentEndpoint}
                                    >
                                    <APIResponse intentRequestData={intentResponseData} i18n={i18n} responseView={responseView} setResponseView={setResponseView} />
                                    </ExplorerViewNew>
                                    <APIRequestLogs
                                        api={currentView}
                                        requestLogs={info.BUILD_FOR_USER ? [] : requestLogsMap[currentView.hash] || []}
                                    />
                                    <div className='grid grid-cols-2 gap-4 text-xs min-h-[150px] p-4 '>
                                        
                                    </div>
                                </div>
                            </div>
                        </>
                        : null 
                    }
                    {
                        user.name && setupView === 'setup' ? <div className='flex-grow flex w-full h-full fixed top-0 right-0 bottom-0 z-10'>
                            <div className='w-1/2 h-full bg-gray-800/70' onClick={() => setSetupView('')}></div>
                            <div className='w-1/2 flex h-full  border-l border-gray-200'>
                                <div className='bg-white relative flex-grow border-r border-gray-200'>
                                    <button className='absolute top-2 right-2' onClick={() => setSetupView('')}>
                                        <IconPack name='close' />
                                    </button>
                                    <ProviderSetup 
                                        user= {!!user.name}
                                        config={config}
                                        provider={provider}
                                        details={details}
                                        title={converterTitle}
                                        i18n={i18n}
                                        submitLock={submitLock}
                                        selected={selected}
                                        endpoint={endpoint}
                                        onConfigSubmit={onConfigSubmit}
                                        onDeleteCredential={onDeleteCredential}
                                    >
                                        <ConnectorSteps
                                            wait={status.wait || details.integrated_wait || details.authorized_wait}
                                            user= {!!user.name}
                                            selected={selected}
                                            details={details}
                                            imgFallback={imgFallback}
                                            endpoint={endpoint}
                                            onStep1Click={onClickSetup}
                                        />
                                    </ProviderSetup>
                                </div>
                                <div className=' w-14 bg-gray-100/80' onClick={() => setSetupView('')}>

                                </div>
                            </div>
                        </div>
                        : null
                    }
                </>
            </EditorCanvas>
        </Layout>
    );
}

