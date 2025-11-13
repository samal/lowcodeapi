"use client";

import React, { useEffect, useState } from 'react';
import localstorage from 'local-storage';
import { useSearchParams, useRouter } from 'next/navigation'; 

import i18nText from '@/static-json/i18n.json';

import apiFetch from '@/utils/request';
import { isAuthenticated } from '@/utils/auth';

import Layout from '@/components/Layout';
import UserView from '@/components/UserLoginUI/view';

import form from '@/static-json/login';

const { email } = form;
const formLength = 2;
const authProvider = [
  {
    name: "Google",
    href: `auth/google`,
    logo: 'google',
    text: "Sign in with Google"
  }
]

const passwordFields = [
  {
    name: "password",
    label: 'Existing Password',
    placeholder: "Existing Password"
  },
  {
    name: "new_password",
    label: 'New Password',
    placeholder: "New Password"
  },  {
    name: "new_password_2",
    label: 'Re-Enter New Password',
    placeholder: "Re-Enter New Password"
  },
]

const newEmailFields = [
  {
    name: "new_email",
    label: 'New Email',
    placeholder: "New Email"
  },  {
    name: "new_email_2",
    label: 'Re-Enter New Email',
    placeholder: "Re-Enter New Email"
  },
]

const defaulFields = {
  password: '',
  new_password: '',
  new_password_2: ''
}
const defaulEmailFields = {
  new_email: '',
  new_email_2: ''
}
export default function LoginPage({
  i18n, 
  info= {}, 
  api_endpoints ={}, 
  user, 
  config, 
  providers
}) {
  const { name } = info;

  const router = useRouter(); 
  const searchParams = useSearchParams(); 

  const  { ACCOUNT_API, BASE_PATH, BASE_PATH_FALLBACK, ENDPOINT } = api_endpoints;

  const [token, setToken] = useState(undefined);
  const [passwordChange, setPasswordChange] = useState({ ...defaulFields });
  const [emailChange, setEmailChange] = useState({ ...defaulEmailFields });

  const [lock, setLock] = useState(false);
  const [intent, setIntent] = useState(false);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    if (typeof window !== 'undefined') { // Guard against SSR
      let freshToken = searchParams.get('token'); 
      let localToken = null; // Use a distinct variable name to avoid confusion with the state variable
      if (freshToken) {
        localstorage.set('token', freshToken);
      } else {
        localToken = localstorage.get('token');
      }

      if(freshToken || localToken) {
        console.log('.........', freshToken, formLength, email.fields.length);
        setToken(freshToken || localToken);
        if (formLength !== email.fields.length || freshToken) {
          ;(async () => {
            router.push(BASE_PATH || BASE_PATH_FALLBACK);
          })();
        }
      }
    }
    return function cleanup() {};
  }, [user, searchParams, router, BASE_PATH, BASE_PATH_FALLBACK]); 

  const onSubmit = async body => {
    if (!body.email) return;
    setLock(true);
    try {
      const data = await apiFetch(`${ACCOUNT_API}/login`, {
        method: 'POST',
        body: {
          ...body,
          email: body.email,
        },
      });

      if (data && data.token) {
        localstorage.remove('token');
        localstorage.set('token', data.token);
        (async () => {
          router.push(BASE_PATH || BASE_PATH_FALLBACK);
        })();
      } else if (data){
        localstorage.remove('token');
        setIntent(true);
        setMessage(data.message);
      }else {
        setIntent(false);
      }
      setLock(false);
    } catch (e) {
      console.log(e);
      setLock(false);
    }
  };


  const onChangeSetNewEmail = (e) => {
    const { name, value } = e.target;

    const local = { ...emailChange, [name]: value};
    setEmailChange({ ...local });
  }

  const onEmailChangeClick = async () => {
    if(!email.fields || email.fields.length !== formLength) return;
    if (!emailChange.new_email || !emailChange.new_email_2) return;
    if (emailChange.new_email !== emailChange.new_email_2) return;

    console.log('....')
    if (!isAuthenticated()) return;
    setLock(true);
    try {
      const data = await apiFetch(`${ACCOUNT_API}/email-change`, {
        method: 'POST',
        body: {
          ...emailChange
        },
      });

      if (data) {
        localstorage.remove('token');
        setMessage('Login email updated successfully, reloading in 1 sec.');
        setTimeout(() => {
          router.refresh(); 
        }, 1000);
      }else {
        setIntent(false);
      }
      setLock(false);
      setPasswordChange({ ...defaulFields })
    } catch (e) {
      console.log(e);
      setLock(false);
    }
  };

  const onChangeSetPassword = (e) => {
    const { name, value } = e.target;

    const local = { ...passwordChange, [name]: value};
    setPasswordChange({ ...local });
  }
  const onPasswordChangeClick = async () => {
    console.log(passwordChange);
    if(!email.fields || email.fields.length !== formLength) return;
    if (!passwordChange.password || !passwordChange.new_password || !passwordChange.new_password_2) return;
    if (passwordChange.new_password !== passwordChange.new_password_2) return;

    if (!isAuthenticated()) return;
    if (lock) return;
    setLock(true);
    try {
      const data = await apiFetch(`${ACCOUNT_API}/password-change`, {
        method: 'POST',
        body: {
          ...passwordChange
        },
      });

      if (data) {
        setMessage('Login password updated successfully, reloading in 1 sec.');
        setTimeout(() => {
          localstorage.remove('token');
          router.refresh();
        }, 1000);
      }else {
        setIntent(false);
      }
      setLock(false);
      setPasswordChange({ ...defaulFields })
    } catch (e) {
      console.log(e);
      setLock(false);
    }
  };
  const disable_google = !!(config.login && config.login.disable_google);
  const disable_email = !!(config.login && config.login.disable_email);
  
  return (
    <Layout info={info} navs={config.navs} user={user} show={false} config={config} hideNav={true} endpoints={api_endpoints}>
      {/* <SEO info={info} scale={false} title={`Login - ${name}`} ogTitle={`Login and access 3rd party API's using ${name} common interface`} /> */}
      <div className='container mx-auto px-8 relative overflow-y-auto focus:outline-none md:my-12'>
        <div className='md:grid md:grid-cols-1  mb-8 rounded-md transition ease-in-out delay-700'>
          { token ? <></>:
            <UserView 
              endpoint={ENDPOINT}
              info={info}
              enable={{ 
                disable_google,
                disable_email,
                login: config.login,
                alternate: !!config.signup,
                disabled_all: !config.login
              }}
              i18n={i18n}
              form={form} 
              lock={lock}
              intent={intent}
              message={message}
              authProvider={authProvider}
              onSubmit={onSubmit}
              providers={providers}
              altLink={{ href :'/signup', text: 'Signup'}}
            />
          }
          {
            token && email.fields.length === formLength ? <div className='md:max-w-7xl md:mx-auto  '>
              <div>
              { message ? <div className='mb-2 flex justify-center'> <p className='text-green-600 bg-green-100 p-4'>{message}</p></div>: null }
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className='bg-white w-full m-auto flex flex-col mt-4 md:mt-0 p-4 md:p-12 rounded-md'>
                  {
                    newEmailFields.map(item => <div key={item.name} className='mt-6'>
                      <label>{item.label}</label>
                      <input type ="email" name={item.name} value={emailChange[item.name]} onChange={onChangeSetNewEmail} className="mt-2 p-2 w-full rounded-md border border-gray-200 text-sm border border-gray-400 hover:shadow focus:outline-none" placeholder={item.placeholder} />
                    </div>)
                  }
                  <div className='mt-6 flex justify-end'>
                    <button type='click' onClick={onEmailChangeClick} className='border border-blue-100 p-2 rounded-md text-white text-sm bg-blue-600 hover:bg-blue-700'>Update Login Email</button>
                  </div>
                </div>
                <div className='bg-white w-full m-auto flex flex-col mt-4 md:mt-0 p-4 md:p-12 rounded-md'>
                  {
                    passwordFields.map(item => <div key={item.name} className='mt-6'>
                      <label>{item.label}</label>
                      <input type ="password" name={item.name} value={passwordChange[item.name]} onChange={onChangeSetPassword} className="mt-2 p-2 w-full rounded-md border border-gray-200 text-sm border border-gray-400 hover:shadow focus:outline-none" placeholder={item.placeholder} />
                    </div>)
                  }
                  <div className='mt-6 flex justify-end'>
                    <button type='click' onClick={onPasswordChangeClick} className='border border-blue-100 p-2 rounded-md text-white text-sm bg-blue-600 hover:bg-blue-700'>Update Login Password</button>
                  </div>
                </div>
              </div>
            </div>: null
          }
        </div>
      </div>
    </Layout>
  );
}
