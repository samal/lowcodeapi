"use client";

import React, { useEffect, useState } from 'react';
import moment from 'moment';
import axios from 'axios';

import i18nText from '@/static-json/i18n.json';
import SEO from '@/components/seo';

import apiFetch from '@/utils/request';
import { isAuthenticated } from '@/utils/auth';

import Layout from '@/components/Layout';
import IconPack from '@/components/IconPack';
import Clipbaord from '@/components/Clipbaord';

export default function SettingsPageClient({ info ={}, api_endpoints ={}, user: userSession, config:configProps }) {
  const { ACCOUNT_API, PROVIDER_LIST_API, APP_CONFIG_API, INTEGRATIONS_API} = api_endpoints;
  const i18n = i18nText.api_keys;
  const [user, setUser] = useState({ ...userSession });
  const [config, setConfig] = useState({
    navs: configProps.navs
  });
  const [loading, setLoading] = useState(true);

  const [newToken, setNewToken] = useState(null);
  const [list, setList] = useState([]);
  useEffect(() => {
    (async () => {
        let sidebarList = [ ];
        const sidebarResp = await apiFetch(`${PROVIDER_LIST_API}?sidebar=1`, {}).catch((error) => ({ error }));
    
        const result = await apiFetch(`${APP_CONFIG_API}/config`, {}).catch((error) => ({ error }));
        let user = null;
        
        if (!sidebarResp.error) {
            sidebarList = sidebarResp.res;
        }
    
        const localConfig = result.res;
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
        
                    console.log("localConfig.navs", localConfig.navs, providers);
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

  useEffect(() => {
    (async () => {
      const url = `${ACCOUNT_API}/api-keys`;
      try {
        const result = await apiFetch(url);
        if (result && result.res) {
          const resp = result.res;
          setList(resp);
        } else {
          console.log(result.message);
        }
      } catch (error) {
        console.log(error.code);
      }
      setLoading(false);
    })();
  }, [user]);

  const getApiTokens = async() => {
    if (loading) return;
    setLoading(true);
    const url = `${ACCOUNT_API}/api-keys`;
    try {
      const result = await apiFetch(url);
      if (result && result.res) {
        const resp = result.res;
        setList(resp);
      } else {
        console.log(result.message);
      }
    } catch (error) {
      console.log(error.code);
    }
    setLoading(false);
  }
  const removeAPIToken = async(token) => {
    if (loading) return;
    setLoading(true);
    const url = `${ACCOUNT_API}/api-keys`;
    try {
        const result = await apiFetch(url, {
            method: "DELETE",
            data: {
                ref_id: token.ref_id,
            }
        });
        if (result && result.res) {
            await getApiTokens();
        } else {
            console.log(result.message);
        }
    } catch (error) {
        console.log(error.code);
    }
    setLoading(false);
  }

  const createNewAPIToken = async () => {
    if (loading) return;
    setLoading(true);
    const url = `${ACCOUNT_API}/api-keys`;
    try {
        const result = await apiFetch(url, {
            method: "POST"
        });
        if (result && result.res) {
            const token = result.res;
            setNewToken(token);
            await getApiTokens();
        } else {
            console.log(result.message);
        }
    } catch (error) {
        console.log(error.code);
    }
    setLoading(false);
  }

  const confirmSaveToken = () => {
    setNewToken(null);
  }
  return (
    <Layout info={info} navs={config.navs} config={config} user={user} endpoints={api_endpoints}>
      <SEO title={i18n.title} info={info} />
      <div className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="container mx-auto px-4 sm:px-6 md:px-8 pt-2 pb-6 md:py-6">
          {
              list.length ? 
              <div className='mt-4 text-gray-700 text-sm'>
                <p className='md:w-1/2 leading-relaxed'>Your API tokens are listed below.</p>
                <table className='mt-4'>
                    <thead>
                    <tr className='border-b border-gray-300'>
                        <td className='p-2'>API Token</td>
                        <td className='p-2'>Created</td>
                        <td className='p-2'>Last used</td>
                        <td className='p-2'></td>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        list.map((item) => (
                            <tr key={item.ref_id} className="border-b border-gray-300">
                                <td className='p-2'>{item.api_token}</td>
                                <td className='p-2'>{moment(item.created_at).format('DD MMM YYYY')}</td>
                                <td className='p-2'>{item.last_used ? moment(item.last_used).format('DD MMM YYYY') : 'Never'}</td>
                                <td className='p-2'>
                                    <button onClick={() => removeAPIToken(item)} className="hover:text-red-600">
                                        <IconPack name='trash' />
                                    </button>
                                </td>
                            </tr>
                        ))
                    }
                    </tbody>
                </table>
                {
                    newToken ? <div className='md:w-1/2'>
                        <div className='mt-8 flex items-center justify-between p-2 bg-gray-300 rounded-sm'>
                            <div className='flex items-center'>
                                <code className='mr-2'>{newToken.api_token}</code> 
                                <Clipbaord text={newToken.api_token} />
                            </div>
                            <button className='ml-2' 
                                onClick={confirmSaveToken}
                                title='I have copied the API token, remove this from the view.'
                            >
                                <IconPack name='close' />
                            </button>
                        </div>
                    </div>
                    : null
                }
              </div>: null
          }
          <div className='mt-8'>
              {
                  !loading ? <> {
                    user.api_token_limit ? 
                      <>
                      {
                        
                        list.length < user.api_token_limit ?
                          <>
                            <div>
                              <button onClick={() => !loading && createNewAPIToken()} className={`flex items-center p-1.5 text-sm rounded-sm shadow-md ${!loading ? 'bg-gray-200 hover:bg-gray-100': 'bg-gray-100 disabled'}`}>
                                  <span className='ml-1'>Generate new api token</span>
                              </button>
                            </div>
                            <p className='text-sm mt-2 text-gray-700 mt-4'>You can create {user.api_token_limit - list.length} more {user.api_token_limit - list.length > 1 ? 'tokens': 'token'}.</p>
                          </>
                        : 
                        <div>
                            <div>
                              <button 
                                  className={`flex items-center bg-gray-200 p-1.5 text-sm rounded-sm text-gray-500 cursor-not-allowed`}
                              >
                                  <span className='ml-1 text-gray-400'>Limit exceeded</span>
                              </button>
                            </div>
                            <div className='text-sm mt-2 text-red-500'>
                              <p>You can have maximum {list.length} active API {user.api_token_limit ? 'tokens': 'token'} in your account.</p>
                              <p>You will have to remove atleast one previously generated api token before you can create a new api token.</p>
                            </div>
                        </div>
                      }
                      </> : <div className='text-sm mt-2 text-gray-500'>
                        <p>Your account is not enabled for generating new api token.</p>
                      </div>
                } </> : null 
              }
          </div>
          </div>
      </div>
    </Layout>
  );
}
