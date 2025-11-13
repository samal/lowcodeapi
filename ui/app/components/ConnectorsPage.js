"use client";

import React, { useState, useEffect, Fragment } from 'react';
import Link from 'next/link'
import axios from 'axios';

import apiFetch from '@/utils/request';
import { isAuthenticated } from '@/utils/auth';

import getLogoUrl from '@/utils/logo-url';

import SEO from '@/components/seo';

import Layout from '@/components/Layout';


export default function ConnectorsPageClient({ info= {}, api_endpoints ={}, user: userSession, config:configProps, sidebar,  providers: released, upcoming, tba, categories: cl, categoryIndex }) {
  const { name } = info;
  const  { BASE_PATH, PROVIDER_LIST_API, INTEGRATIONS_API, APP_CONFIG_API}  = api_endpoints;
  const [user, setUser] = useState({ ...userSession });

  const [config, setConfig] = useState({
    ...configProps,
    navs: sidebar,
  });
  const [imgFallback, setImgFallback] = useState({}); 
  const [providers, setProviders] = useState(released);
  const [providersAll, setProvidersAll] = useState([ ...released, ...upcoming, ...tba]);
  const [categories, setCategories] = useState(cl);
  const [activeCategory, setActiveCatetory] = useState('All'); 
  const [categoryCount, setCategoryCount] = useState({ ...categoryIndex });

  useEffect(() => {
    (async () => {
        let sidebarList = [ ];
        const sidebarResp = await apiFetch(`${PROVIDER_LIST_API}?sidebar=1`, {}).catch((error) => ({ error }));
    
        const result = await apiFetch(`${APP_CONFIG_API}/config`, {}).catch((error) => ({ error }));
        let user = null;
        
        if (!sidebarResp.error) {
            sidebarList = sidebarResp.res || sidebar;
        }
    
        const localConfig = { ...config, ...result.res };
        if (isAuthenticated()) {
            try {
                const resp = await apiFetch(`${APP_CONFIG_API}/user-state`, {});
                user = resp.res;
        
                if (!user) return setError('Some error getting the details');
                const url = (!user || !user.registration_completed)  ? `${INTEGRATIONS_API}` : `${INTEGRATIONS_API}/providers?filter=0&lookup=1`;
                const { res: providers } = await apiFetch(url, {});
        
                if(user && (!user.registration_completed || !user.name)) {
                    const navs = sidebarList;
                    localConfig.navs = navs
                    setUser(user);
                    setConfig(localConfig);
                    return;
                } else {
                    setUser(user);

                    localConfig.navs = sidebarList.map(item => {
                        return {
                            ...item, 
                            allowed: (item.paid_service && user.subscription_active) ? true : false,
                            integration: providers[item.id],
                        }
                    });
        
                    setConfig(localConfig);
                }
            } catch (e) {
                console.log('Error', e);
                const navs = sidebarList;
                localConfig.navs = navs
                setConfig(localConfig);
                setUser({
                    guest: true,
                });
            }
        } else {
            const navs = sidebarList; 
            localConfig.navs = navs
            setConfig(localConfig);
            setUser({
                guest: true,
            });
        }
    })();
  }, []);

  useEffect( () => {
    (async () => {
      const sidebarResp = await apiFetch(`${PROVIDER_LIST_API}?full=1`, {}).catch((error) => ({ error }));
      
      if (!sidebarResp.error) {
        const providersList = sidebarResp.res;
        setProviders(providersList);
        setProvidersAll(providersList);
        const categories = [...new Set(providersList.map((p) => p.category).filter(i => !!i).sort())];
        const categoryCount =  {
          All : providersList.length,
        }

        providersList.forEach((provider) => {
          const { category } = provider;
          if (category) {
            if (categoryCount[category]) {
              categoryCount[category]  = categoryCount[category] + 1;
            } else {
              categoryCount[category] = 1;
            }
          }
        });
        setCategories([`All`, ...categories]);
        setCategoryCount(categoryCount)
      }
    })();
  },[]);
  
  const onCategoryClick = (category) => {
    setActiveCatetory(category);
    const matched = providersAll.filter((item) => item.category === category);
    console.log(matched, category, providersAll);
    if (matched.length) {
      setProviders([ ...matched]);
      setActiveCatetory(category);
    } else {
      setProviders([...providersAll]);
      setActiveCatetory('All');
    }
  }
  const onError = (e, provider) => {
    const lf = { ...imgFallback };
    lf[provider] = 'lowcodeapi';
    setImgFallback({ ...lf });
  }

  const listMap = [
    {
      id: 'released',
      title: '',
      list: released,
    },
    {
      id: 'tbs',
      title: 'To be released',
      list: tba,
      testing: true,
    },
    {
      id: 'upcoming',
      title: 'Upcoming',
      list: upcoming
    }
  ]
  
  return (
    <Layout info={info} navs={config.navs} user={user} config={config} show={false} endpoints={api_endpoints}>

      <SEO info={info} title='Providers' ogTitle={`Access API of ${released.length}+ services using ${name} common API interface and save weeks of development time and effort.`} />

      <div className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="flex items-center flex-wrap max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-2 pb-6 md:py-6">
          <div className='flex items-center flex-wrap mb-4'>
          {
            false && categories.map((category, index) => (<div key={category} className="p-0.5 px-1 m-1 ml-1.5 text-sm">
              <button type='button' 
                onClick={() => onCategoryClick(category)}
                className={`flex items-center text-sm text-gray-500 hover:text-gray-700 cursor-pointer ${activeCategory === category ? 'p-1 border border-gray-300 rounded-md bg-gray-200' : 'p-1 border border-gray-100 hover:border-gray-300 hover:rounded-md hover:bg-gray-200'}`}
              >
                <span className=''>{ !index? '🗂️' : activeCategory === category ? '📂': '📁'} </span> 
                <span className='hover:underline mx-1.5'>
                {category} 
                </span>
                {
                categoryCount[category] ? 
                  <>
                    <span className={`text-xs p-0.5 px-1.5 ml-1 rounded-md ${activeCategory === category ? 'bg-gray-300 text-gray-600': 'bg-gray-200'}`}>{categoryCount[category]}</span>
                  </>
                : null
                }
              </button>
            </div>))
          }
          </div>
          
          {
            activeCategory !== 'All'? 
            <>
              <div className='flex items-center flex-wrap mb-8'>
              {
                providers.map(item =>(
                  <div key={item.id} className="">
                    {
                      !item.disabled? <>
                        <Link
                          href={`${BASE_PATH}/${item.id}`}
                          title={item.name}
                          className="cursor-pointer"
                          data-tip={item.name}>
                          <>                       
                            <img src={getLogoUrl(imgFallback[item.id] || item.alias ||item.id)} className={`w-14 h-14 ml-2 mt-2 p-1 border border-gray-200 rounded-md`} alt={item.name} title={item.name}
                            onError={(e) => onError(e, item.id)}
                          />
                          </>
  
                        </Link>
                      </> : 
                      <span className='relative'>
                        <img src={getLogoUrl(imgFallback[item.id] || item.alias ||item.id)} 
                          className={`w-14 h-14 ml-2 mt-2 p-1 border border-gray-500 rounded-md opacity-20`} 
                          alt={item.name} title={`${item.name}`}
                          onError={(e) => onError(e, item.id)}
                        />
                        <span className='absolute left-0 right-0 top-0 bottom-0  ml-2 mt-2 '>
                          <span className='px-1 py-0.5 text-sm' title={`${item.name} to be released`}>🔒</span>
                        </span>
                      </span>
                    }
                  </div>
                ))
              }
              </div>
            </>
            : 
            <>
              {
                listMap.map((itemMap) => (
                  <div className='flex items-center flex-wrap mb-8' key = {itemMap.id}>
                    {
                    itemMap.list.map(item =>(
                      <div key={item.id} className="">
                        {
                          !item.disabled? <>
                            <Link
                              href={`${BASE_PATH}/${item.id}`}
                              title={item.name}
                              className="cursor-pointer"
                              data-tip={item.name}>
                              <>                       
                                <img src={getLogoUrl(imgFallback[item.id] || item.alias ||item.id)} className={`w-14 h-14 ml-2 mt-2 p-1 border border-gray-200 rounded-md ${itemMap.testing ? 'opacity-70': ''}`} alt={item.name} title={itemMap.testing ? `${item.name}: pending released`: `${item.name}`}
                                onError={(e) => onError(e, item.id)}
                              />
                              </>

                            </Link>
                          </> : 
                          <span className='relative'>
                            <img src={getLogoUrl(imgFallback[item.id] || item.alias ||item.id)} 
                              className={`w-14 h-14 ml-2 mt-2 p-1 border border-gray-500 rounded-md opacity-20`} 
                              alt={item.name} title={`${item.name}`}
                              onError={(e) => onError(e, item.id)}
                            />
                            <span className='absolute left-0 right-0 top-0 bottom-0  ml-2 mt-2 '>
                              <span className='px-1 py-0.5 text-sm' title={`${item.name} to be released`}>🔒</span>
                            </span>
                          </span>
                        }
                      </div>
                    ))
                  }
                  </div>
                ))
              }
            </>
          }
        </div>
      </div>
    </Layout>
  );
}
