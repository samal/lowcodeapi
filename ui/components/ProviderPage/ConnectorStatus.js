import React from "react";

import IconPack from '../IconPack';

const OAUTH = ['OAUTH2.0', 'OAUTH1.0', 'OAUTH1.0a'];

const OAuth = ({ user, selected, details, endpoint, setConfigurationView}) => {
  return (<div className="relative flex items-center justify-end text-xs">
    <div id="step3" className="flex items-center relative">
    {
      details.authorized && details.integrated ? 
        <>
          <div className=" px-2 py-1 font-medium text-green-800 rounded-full  inline-flex items-center justify-center z-10">
            <span className="">
              <IconPack name="checked"/>
            </span>
            <span className="mx-1">Connected</span>
          </div>
        </>
        : <>
          {
            user ? <div className=" px-2 inline-flex items-center justify-center z-10">
              <span className="font-medium text-orange-700">Authorization Pending</span>
              {
                details.credentials ?  
                  <a href={`${endpoint.app_endpoint}/auth/${selected.id}`} className="underline">Click to Authorize</a> 
                : null
              }
            </div>
            : null 
          }
      </>
    }
    </div>
  </div>)
}

const Token = ({ user, selected, details, imgFallback, endpoint, setConfigurationView }) => {
  return (<>
    <div className="relative flex items-center justify-end text-xs">
      {
        details.credentials && details.integrated ? 
          <div className="flex items-center relative">
            <div className=" px-2 py-1 font-medium text-green-800  rounded-full  inline-flex items-center justify-center z-10">
              <span className="">
                <IconPack name="checked"/>
              </span>
              <span className="mx-1">Connected</span>
            </div>
          </div>
          : <div className="relative ">
            {
            user ?
              <div className="flex items-center">
                <div className=" px-2 py-1 mx-1 font-medium text-gray-800 border border-gray-200 rounded-full  border inline-flex items-center justify-center z-10">
                  <span>
                    <IconPack name="warn"/>
                  </span>
                  <span className="ml-1">Not Connected</span>
                </div> 
              </div>
              : null
            }
        </div>
      }
      <div className="hidden flex items-center relative">
        {
          details.credentials && details.integrated ?  
          <>
            <span className="mx-1 animate-pulse">⚡</span>
            {/* <div className=" px-2 py-1 font-medium rounded-full  border inline-flex items-center justify-center z-10">
              <Image 
                src={getLogoUrl(selected.logo_path || imgFallback[selected.id] || selected.alias ||selected.id)}
                className={`mr-1`} 
                alt={selected.name} 
                width={14}
                height={14}
                onError={(e) => onError(e, selected.id)}
                onClick={() => onClickTab(view)}
              /> 
              <span>{selected.name}</span>
            </div> */}
          </>
          : null
        }
      </div>
    </div>
  </>)
}
export function ConnectorSteps({ wait, user, selected, details, imgFallback, endpoint, onStep1Click, setConfigurationView }) {
  if (!selected.auth_type) return null;
  if (wait) {
      return (<div className="flex items-center justify-end text-sm p-4">
          <div className='flex items-center justify-end text-xs'>
              <IconPack name="spin" />
          </div> 
      </div>)
  }
  return <div className="text-sm">
    { 
      OAUTH.includes(selected.auth_type) ? 
        <OAuth user={user} selected={selected} details={details} imgFallback={imgFallback} endpoint={endpoint} onStep1Click={onStep1Click} setConfigurationView={setConfigurationView} /> 
        : 
        <Token user={user} selected={selected} details={details} imgFallback={imgFallback} endpoint={endpoint} onStep1Click={onStep1Click} setConfigurationView={setConfigurationView} />
    }
  </div>
}

export default ConnectorSteps;
