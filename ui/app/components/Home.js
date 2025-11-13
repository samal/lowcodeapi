"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; // Added useSearchParams

import axios from 'axios';
import queryString from 'query-string';

import apiFetch from '@/utils/request';
import { isAuthenticated } from '@/utils/auth';

import i18n from '@/static-json/i18n.json';

import ExplorerViewNew from '@/components/ExplorerView';
import { IntentTab, ConnectorStatus, IntentHead } from '@/components/ProviderPage';
import APIRequestLogs from '@/components/ExplorerView/APIRequestLogs';
import APIResponse from '@/components/ExplorerView/APIResponse';
import Layout from '@/components/EditorLayout';
import EditorCanvas from '@/components/EditorCanvas';

export default function Home({
  info={},
  api_endpoints = {},
  user: userSession,
  config:configProps,
  sidebar,
  apis = [],
  providers : providersList,
  endpoint = {},
}) {

  const searchParams = useSearchParams(); // Initialize useSearchParams

  const provider = searchParams.get('provider'); // Get 'provider' from search params
  const providerDisplay = searchParams.get('providers'); // Get 'providers' from search params

  const {
    BASE_API,
    METRICS_API,
    APP_CONFIG_API,
    INTEGRATIONS_API,
  } = api_endpoints;


  const [renderingWait, setRenderingWait] = useState(false);  
  const [uriLocation] = useState('');
  const [user, setUser] = useState({ ...userSession });
  const [providerIntentMetrics, setProviderIntentMetrics] = useState({ });
  const [data, setData] = useState({
    error: null,
  });
  const [intentAction, setIntentAction] = useState({});

  const [config, setConfig] = useState({
    ...configProps,
    navs: sidebar,
  });
  const [cachedPayload, setCachePayload] = useState({});

  const [paneView, setPaneView] = useState(false);
  const [codeView, setCodeView] = useState(false);
  const [imgFallback, setImgFallback] = useState({}); 
  const [currentView, setCurrentView] = useState(apis[0]);
  const [selected, setSelected] = useState(null);
  const [apiViewList, setApiViewList] = useState([]);
  const [apiViewFeaturedList, setApiViewFeaturedList] = useState(apis);

  const [providerIntegrated, setProviderIntegrated] = useState({});

  const [requestWait, setRequestWait] = useState(false);

  const [intentRequestData, setIntentRequestData] = useState({
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

  const [providersAll, setProvidersAll] = useState([

  ]);

  // @ Review: If this filter is needed or we can remove it.
  useEffect(() => {
    if (providerDisplay && providerDisplay.trim()) {
      const filterProviders = providerDisplay.split(',');
      const lpg = [{ list: [ ...providersList ] }].map(item => {
        const local = { ...item };
        let list = [ ...local.list ];

        list = list.filter(i => {
            return filterProviders.includes(i.id);
        });
        local.list = list;
        return local;
      });

      setProvidersAll([ ...lpg[0].list ]);
      setPaneView(true);
    } else if (apis.length) {
      setSelected(apis[0].selected);
    }
  }, [apis, providerDisplay, providersList, provider]); // Added 'provider' to dependency array
  
  useEffect(() => {
    ;(async () => {    
        const { data: dynamicConfig } = await axios(`${APP_CONFIG_API}/config`, {}).catch((error) => ({ error }));
        let user = null;

        const localConfig = { ...config, ...dynamicConfig.res, ...configProps.disable };
        setUser({ loading : true });
        if (isAuthenticated()) {
            try {
                const { res } = await apiFetch(`${APP_CONFIG_API}/user-state`, {});
                user = res;
        
                if (!user) return setError('Some error getting the details');
        
                if(user && (!user.registration_completed || !user.name)) {
                    setUser(user);
                    setConfig(localConfig);
                    return;
                } else {
                    setUser(user);      
                    setConfig(localConfig);
                }
            } catch (e) {
                console.log('Error', e);
                setConfig(localConfig);
                setUser({
                    guest: true,
                    loading: false
                });
            }
        } else {
            setConfig(localConfig);
            setUser({
                guest: true,
            });
        }
    })();
  }, []);
  

  useEffect(() => {
    if (!selected || !selected.id) return;
    ;(async () => {
      try {
        const provider = selected && selected.id ? selected.id : 'default';
        const integration = selected && selected.integration_map ? selected.integration_map : provider;
        const result = await apiFetch(`${INTEGRATIONS_API}/${integration}?check=1`, {
          method: 'GET'
        },{
          skip: true
        })
        const data = result.res;
        const localProviderIntegrated = { ...providerIntegrated }; 

        const localDetail = { };

        localDetail.integrated = !!data.activated;
        localDetail.authorized = data.authorized;
        localDetail.credential_found = data.credential_found;
        localDetail.credentials = data.credential_found;
        localDetail.masked_credentials = { ...data[selected.id], selected_scopes: undefined};

        setProviderIntegrated({
          ...localProviderIntegrated,
          [provider]: {
            ...localDetail
          }
        });
      } catch(e) {
        console.log(e);
      }
    })();
  }, [currentView, user.name]);
  
  const onError = (e, provider) => {
    const lf = { ...imgFallback };
    lf[provider] = 'lowcodeapi';
    setImgFallback({ ...lf });
  }  

  const chooseCurrentView = (list) => {
    if (list.length) {
      const view = list[0];
      setCurrentView(view);
      return view;
    }
    return {}
  }
  const onClickTab = async(view) => {
    if (renderingWait) return;
    if(view) {
      setCurrentView(view);
      setRenderingWait(true);
    }

    const { selected } = view;
    const { id: provider } = selected;
    setSelected(view.selected);
    let lacalViewInstane = { ...view, };
    if (providerIntegrated[provider]) {
      lacalViewInstane = { ...lacalViewInstane, details: providerIntegrated[provider] };
    }
    setCurrentView({ ...lacalViewInstane });
    setRenderingWait(false);

    if (isAuthenticated()) {       
      const method = view.method;
      const intent = view.route_name;

      ;(async () => {
        try {
            const qs1 = queryString.stringify({ mode: 'fav', method, provider,  intent });
            const fav = await apiFetch(`${BASE_API}/intent?${qs1}`, {}).catch((error) => ({ error }));
            const localIntentAction = { ...intentAction };
            setIntentAction({
                ...localIntentAction,
                [intent]: {
                    fav: !!fav.results,
                } 
            });
        } catch(e) {
            console.log(e);
        }
      })();
      const qs1 = queryString.stringify({ method, provider,  intent });
      try {
        const resp = await apiFetch(`${METRICS_API}?${qs1}`, {});
        const { data } = resp.results;
        setProviderIntentMetrics({
          ...providerIntentMetrics,
          [provider]: data[provider]
      });
      } catch(e) {
          console.log(e);
      }
    }
  }
  const onSaveIntentAction = async (action) => {
    setIntentAction({ ...action });
  }
  const onDeleteIntentAction = async(action) => {
    setIntentAction({ ...action });
    const apiListFiltered = apiViewList.filter(api => {
      return api.route_name !== currentView.route_name;
    });

    if (apiListFiltered.length) {
      const newApiView = apiListFiltered[0];
      setCurrentView({ ...newApiView });
      setApiViewList(apiListFiltered);
      setSelected(newApiView.selected);
    } else if (apiViewFeaturedList.length) {
      const newApiView = apiViewFeaturedList[0];
      setCurrentView({ ...newApiView });
      setApiViewList([]);
      setSelected(newApiView.selected);
    }
  }

  const openSetupView = (provider, goto) => {
    window.location.href=`/${provider}?view=configure`;
  }
  const onChangeCachePayload = (payload) => {
    let localCachePayload = { ...cachedPayload };
    const provider = selected && selected.provider ? selected.provider : 'default';
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
  const isIntegrated  = () => {
    if (!currentView || !currentView.selected.id) return false;
    
    const status = providerIntegrated[currentView.selected.id];
    if(!status) return false;

    return !!(status.integrated || status.authorized);
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
            setIntentRequestData({
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
            setIntentRequestData({
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

  console.log('providersAll', providersAll);
  return (
    <Layout info={info} navs={config.navs} user={user} show={false} config={config} endpoints={api_endpoints}>
      <EditorCanvas 
        paneView={paneView}
        user={user}
        config={config}
        info={info}
        providers={providersList}
        providersAll={providersAll}
        metrics={providerIntentMetrics}
        api_endpoints={api_endpoints}
      >
        <div className='p-4 pb-2 md:pt-0 bg-gray-50'>
          <div className='grid grid-cols-10 gap-2 relative'>
            <div className={`${user && user.name ? 'col-span-10' : 'col-span-8'} overflow-x-scroll `}>
              <div className='flex items-center border-b border-gray-100 overflow-scroll'>
              {
                [...apiViewFeaturedList].map((item) => (
                  <IntentTab 
                    key={item.featured ? `${item.summary}.${item.featured}`: item.summary}
                    selected={item.selected}
                    fixed={true}
                    method={item ? item.method : ''}
                    renderingWait={renderingWait}
                    view={item}
                    title={item ? item.summary : ''}
                    provider={''}
                    tabView={currentView ? currentView : chooseCurrentView(apiViewFeaturedList)} 
                    user={user}
                    pending={false}
                    imgFallback={imgFallback}
                    onError={onError}
                    onClickTab={onClickTab}
                    onClose={() => {}}
                  />                                            
                ))
              }
              </div>
            </div>
          </div>
        </div>
        {
          currentView ?
            <>
              <IntentHead
                userAuthorized={user && user.name}
                selected={currentView.selected}
                total_providers={providersList.length}
                view={currentView}
                bookmark={false}
                metrics={providerIntentMetrics}
                intentAction={intentAction}
                pin={false}
                api_endpoints={api_endpoints}
                uriLocation={uriLocation}
                onClickTab={onClickTab}
                onSaveAction={onSaveIntentAction}
                onDeleteAction={onDeleteIntentAction}
              >
                <ConnectorStatus
                    wait={false}
                    endpoint={endpoint}
                    selected={selected}
                    user= {!!user.name}
                    details={currentView.details}
                    imgFallback={imgFallback}
                    setConfigurationView={() => openSetupView(selected.id, 'setup')}
                />
              </IntentHead>
              <div className='flex-grow overflow-scroll h-lvh p-4 py-2 pt-0 bg-gray-50'>
                <ExplorerViewNew
                  i18n={i18n}
                  api={currentView}
                  codeView={codeView}
                  cachedPayload={cachedPayload[currentView.id] ? cachedPayload[currentView.id][currentView.hash] : {}}
                  system={{ }}
                  requestWait={requestWait}
                  requestLogs={[]}
                  errorLogs={[]}
                  onChangeCachePayload={onChangeCachePayload}
                  details={{
                      breadcrumbs: data.breadcrumbs,
                      ...currentView.details, 
                      provider: currentView.selected.id,
                      system_creds: null,
                      ready: isIntegrated(), 
                      total:data.total, 
                      api_token: user.api_token, 
                      user: !!user.name,
                      api_security: null,
                      ignore: null
                  }}
                  setConfigurationView={() => {}}
                  onClickTryIntentEndpoint={onClickTryIntentEndpoint}

                >
                  <APIResponse intentRequestData={intentRequestData} i18n={i18n} responseView={responseView} setResponseView={setResponseView} />
                </ExplorerViewNew>
                <APIRequestLogs
                  api={currentView}
                  requestLogs={[]}
                />
                <div className='grid grid-cols-2 gap-4 text-xs min-h-[150px] p-4 '>
                    
                </div>
              </div>
            </> : null
        }
      </EditorCanvas>
    </Layout>
  );
}
