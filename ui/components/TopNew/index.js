import React, {useState, useEffect} from 'react';
import Link from 'next/link';
import ProfileTab from '../ProfileTabNew';

import userAvatar from '../../public/avatar.svg';

const navsDefault = [];

const Bar = ({ info = {}, config = {} , home , BASE_PATH = '', BASE_PATH_FALLBACK = '/', navs = navsDefault, user, brand, onLogout, hideNav = false }) => {
  const loginLink = `${BASE_PATH}/login`;
  
  const [href, setHref] = useState(''); 
  useEffect(() => {
    const href= window && window.location.href;
    setHref(href);
  },[]);

  const account_config = config.disable || { ...config };
  return <div className=''>
    {
      user && user.name ? 
        <div className='text-xs flex items-center py-2 bg-gray-100'>
          <ProfileTab
            title={`${user.name} (${user.email}) ${user.subscription_active ? '': ''}`}
            name={user.name}
            data={user}
            pro = {user.subscription_active}
            country_code={user.country_code}
            avatar={Object.keys(user.avatars || {}).length? user.avatars : userAvatar}
            onClick={onLogout}
          />
        </div> 
        : <>{
          !hideNav ? <>
            <div className=' text-xs py-2 text-gray-700'>
            {
              user.guest ? <>
                {
                  account_config.signup || account_config.login ? <>
                      <div className='flex flex-col items-center justify-center text-xs text-gray-600'>
                        {
                          account_config.login ? <Link href={loginLink} className='underline my-2'>
                              Login
                            </Link>
                            : null
                        }
                        {/*
                        {
                          account_config.signup ? <>
                            <Link href={signupLink} className='underline'>
                              Signup
                            </Link>
                          </>
                          : null
                        } */}
                      </div>
                  </> : null
                }
              </> : <> </>
            }
            </div> 
          </>  : null
        } 
        </>                              
    }
  </div>;
};

export default Bar;
