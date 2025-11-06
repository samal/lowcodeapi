import React, {useState, useEffect} from 'react';
import Link from 'next/link';
import IconPack from '../IconPack';

const tabs = [
  // {
  //   "id": "fav",
  //   "name": "Favorite",
  //   "description": "User's Favorite API for Quick Access",
  //   "icon": "bookmarks",
  //   "disabled": false,
  //   "released": true,
  //   "login_required": true,
  //   "visible": true
  // },
  {
    "id": "settings",
    "icon": "cog",
    "description": "User's API Token for accessing the Providers API",
    "name": "Token",
    "login_required": true,
    "disabled": false,
    "visible": true
  },
];

const NavRight = ({ info = {}, user }) => {
  const { disable_tabs } = info;
  
  return <div className=" ">
    {
    !disable_tabs && tabs.length ? <div className='my-2 flex flex-col items-center justity-center'>
      {
        tabs.filter((item) => item.visible).filter((item) => { 
          if (item.login_required) {
            if (user.name) return true;
            return false;
          } else {
            return true
          }
        }).map((item)=>(
          (user && user.name) || !item.login_required ? 
            <Link href={`/${item.id}`} key={item.id} className={`text-xs font-medium underline text-gray-600 hover:text-gray-700 p-1 mb-2 uppercase hover:text-gray-900`} title={item.description ||  item.name} >
              { item.icon ?  <IconPack name={item.icon} /> : <span>{item.name}</span>}
            </Link> 
          : <span key={item.id} className={`text-xs font-medium underline text-gray-400 hover:text-gray-600 p-1 mb-2 uppercase hover:text-gray-900`} 
            title={item.description_public || `Login: ${item.description ||  item.name}`} >
            { item.icon ?  <IconPack name={item.icon} /> : <span>{item.name}</span>}
          </span> 
        ))
      }
      </div> : null
    }
    </div>;
};

export default NavRight;
