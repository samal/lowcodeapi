"use client";

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import fromNow from 'dayjs/plugin/relativeTime';
import Image from 'next/image';
import axios from 'axios';

import apiFetch from '@/utils/request';
import { isAuthenticated } from '@/utils/auth';
import getLogoUrl from '@/utils/logo-url';

import Layout from '@/components/EditorLayout';

dayjs.extend(fromNow);

export default function Home({
  api_endpoints = {},
  user: userSession,
  config:configProps,
  sidebar,
  providers : providersList,
}) {

  const {
    APP_CONFIG_API,
  } = api_endpoints;

  const [user, setUser] = useState({ ...userSession });

  const [config, setConfig] = useState({
    ...configProps,
    navs: sidebar,
  });

  const [imgFallback, setImgFallback] = useState({}); 

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
  
  const onError = (e, provider) => {
    const lf = { ...imgFallback };
    lf[provider] = 'lowcodeapi';
    setImgFallback({ ...lf });
  }  


  return (
    <Layout>
      <div className='p-6 pt-2 sm:pt-4 sm:p-8 bg-gray-50 z-10 overflow-hidden'>
        <div className='flex flex-col md:container md:mx-auto h-full overflow-y-scroll'>
          <div className='flex items-center gap-2 mb-6 sm:mb-8'>
            <Image src={getLogoUrl('lowcodeapi')} alt='LowcodeAPI' width={35} height={35} className='rounded-md' />
            <h1 className='text-2xl font-bold text-gray-900'>Providers ({providersList.length})</h1>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6'>
            {
                providersList.map(item =>(
                    <div key={item.id} className="relative">
                        {
                        !item.disabled? (
                          <div className="flex flex-col h-full bg-gray-100 hover:bg-white rounded-lg border border-gray-200/50 hover:border-gray-300 hover:shadow transition-all duration-200 overflow-hidden">
                            <div className="flex-1 p-5 sm:p-6">
                              {/* Header with Logo and Name */}
                              <div className="flex items-start gap-3 sm:gap-4 mb-4">
                                <div className="flex-shrink-0">
                                  <img 
                                    src={getLogoUrl(imgFallback[item.id] || item.alias || item.id)} 
                                    className="w-12 h-12 sm:w-14 sm:h-14 p-1.5 sm:p-2 border border-gray-200/60 rounded-lg bg-white transition-colors" 
                                    alt={item.name} 
                                title={item.name}
                                    onError={(e) => onError(e, item.id)}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate leading-tight">
                                      {item.name}
                                    </h3>
                                    <a
                                      href={`/${item.id}`}
                                      title={`View ${item.name} APIs`}
                                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span className="sr-only">View {item.name} Explorer</span>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </a>
                                  </div>
                                  {item.total_api && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200/60">
                                        {item.total_api} Endpoints
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Description */}
                              {item.description && (
                                <p className="text-xs text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              )}

                              {/* Metadata Grid */}
                              <div className="space-y-2.5 border-t border-gray-100 pt-4 mt-4">
                                {item.api_link_ref && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-gray-500 min-w-[50px]">Docs:</span>
                                    <a 
                                      href={item.api_link_ref} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      title={item.api_link_ref}
                                      className="text-xs text-gray-600 hover:text-gray-900 hover:underline break-all flex-1"
                                    >
                                      {item.api_link_ref.length > 25 ? `${item.api_link_ref.substring(0, 25)}...` : item.api_link_ref}
                                    </a>
                                  </div>
                                )}
                                {item.auth_type && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 min-w-[50px]">Auth:</span>
                                    <span className="text-xs text-gray-600">{item.auth_type}</span>
                                  </div>
                                )}
                                {item.category && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 min-w-[50px]">Category:</span>
                                    <span className="text-xs text-gray-600">{item.category}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {item.updated_at && (
                              <div className="px-5 sm:px-6 py-3">
                                <span className="text-xs text-gray-400">Last updated {dayjs(item.updated_at).fromNow()} on {dayjs(item.updated_at).format('MMM D, YYYY')}</span>
                              </div>
                            )}
                          </div>
                        ) : null
                        }
                    </div>
                ))
            }
            </div>
        </div>
      </div>
    </Layout>
  );
}
