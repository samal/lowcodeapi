import React, { memo, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import lodash, { capitalize, set } from 'lodash';
import FormData from 'form-data';
import ReactMarkdown from 'react-markdown'

import CodeEditor from '../CodeEditor';

import CodeSnippet from './snippet';
import IconPack from '../IconPack';
import FormUI from '../ExplorerFormUI';
import HTTPMethodLabel from '../HTTPMethodLabel';

import { generate, codeMap } from './lang';

import Link from 'next/link';

lodash.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g,
}
const components = {
  h2: ({node, ...props}) => <h2 className='my-2 font-bold leading-relaxed' {...props} />,
  h3: ({node, ...props}) => <h2 className='my-2 font-bold leading-relaxed' {...props} />,
  p: ({node, ...props}) => <p className='mb-2 leading-relaxed' {...props} />,
  strong: ({node, ...props}) => <strong className='font-semibold' {...props} />,
  pre: ({node, ...props}) => <pre className='w-full text-xs px-1.5 p-1 bg-gray-700  text-white rounded-md my-2 leading-' {...props} />,
  code: ({node, ...props}) => <code className='w-full text-xs bg-gray-700  text-white px-1.5 p-1  ' {...props} />,
  a: ({node, ...props}) => <a className='text-gray-700 underline' {...props} />,

}

function maskToken(url) {
  if (!/api_token/.test(url)) return url;
  const split = url.split('api_token');
  return `${split[0]}api_token=xxxxx-masked-xxxxxx`;
}

function getUrl(details, api, query) {
  let buildUrl = `${details.service_url}${api.route_name}`;

  const { query_params = [], path_params = []} = api;
  const hasPathOrQueryParams = query_params.length || path_params.length;
  if (hasPathOrQueryParams) {
    let fragment = '';
    [...query_params, ...path_params].forEach(item => {

      // We need this type of check, because we need value 0 in the url.
      // This is kind of hacky, since query param will always be a string value, probably default falsy check also be done here after we typecase 0 to string. 
      if ([undefined, null, ''].includes(query[item.name])) return;

      const regEx = new RegExp(`:${item.name}`);
      if (regEx.test(api.route_name)) {
        buildUrl = buildUrl.replace(`:${item.name}`, query[item.name]);
      }else if (fragment) {
        fragment += `&${item.name}=${query[item.name]}`;
      } else {
        fragment = `${item.name}=${query[item.name]}`;
      }
    });
    if (fragment) {
      buildUrl = `${buildUrl}?${fragment}`;
    }
  }

  const displayUrl = buildUrl;
  if (!api.is_public && details.api_token) {
    buildUrl = /\?/.test(buildUrl)
      ? `${buildUrl}&api_token=${details.api_token}`
      : `${buildUrl}?api_token=${details.api_token}`;
  }

  let responseType = null;

  if (/\/screenshot\?/.test(buildUrl)) {
    responseType = 'blob';
  }
  return {buildUrl, displayUrl, responseType};
}

const ApiDescription = ({ api, view }) => {
  return (<div className='w-full'>
    {
      view === 'description' ? <div className="flex justify-between items-center my-2 text-xs">
        <div className='flex-grow'>
          <ReactMarkdown
            components={components}
          >
          {api.description}
          </ReactMarkdown>
        </div>
      </div> : null
    }
    {
      api.externalDocs && api.externalDocs.api_ref ? <>
        <div className=' py-2'>API Reference Link</div>
        {
          api.externalDocs.api_ref.split(',').map((item) =>(
            <a href={item} key={item} className="flex items-center text-blue-600 underline mb-1 text-gray-700 truncate" target='_blank'>
              <span className='text-gray-800'>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
              </span>
              <span className='ml-1'>{item}</span>
            </a>)
          )
        }
        
      </>
      : null
    }
  </div>)
}

const payloadTextMap = {
  "payload_saved": { 
    "title": "Saved List", 
    "info": "The list of payload saved for future reuse.",
    "empty": "You have not saved any payload for this API Endpoint."
  },
  "payload_history": { 
    "title": "Payload Used in the Previous Request",
    "info": "The list of payload used in api request previously.", 
    "empty": "No previous request found. It seems you have not tried this API Endpoint."
  },
  "payload_examples": { 
    "title": "Examples Payload",
    "info": "The list of payload for trying this API Endpoint with sample payload.", 
    "empty": "No examples payload found for this API Endpoint."
  },
}
const capitalize_text = (text) => {
  const words = text.toLowerCase().split('_').map(item => {
    return capitalize(item);
  });

  return {
    name: words.splice(1).join(" "),

    text: payloadTextMap[text] ? payloadTextMap[text].title : words.join(" "),
    info: payloadTextMap[text] ? payloadTextMap[text].info : '',
    empty: payloadTextMap[text] ? payloadTextMap[text].empty : '',
    words,
    
  }
}
const ContentType = ({ type }) => {
  return <div className="text-xs ">
    <span className={`p-1 pl-0`}>Content Type : <span className='font-semibold'>{type}</span></span>
  </div>
}
const secondHalfDefaultTabs = [
  {
    name: 'Request',
    title: '',
    id: 'request'
  },
  {
    name: 'API Overview',
    title: '',
    id: 'description'
  },
]
function API_IntentView({ children, requestWait, api, cachedPayload = {}, onChangeCachePayload, hydration_map, saveAllowed, system, details, i18n, getHydrationData = () =>{}, saveUsersIntentPayload, onClickTryIntentEndpoint }) {
  
  const postType = ["POST", "PATCH", "PUT", "DELETE"].includes(api.method);
  const [isPostRequest, setIsPostRequest] = useState(postType);

  const [fullKeysView, setFullKeysView] = useState({
    query_params: false,
    form_data: false,
    body: false
  });
  const [secondHalfTabs, setSecondHalfTabs] = useState(() => {
    return secondHalfDefaultTabs.map(tab => {
      const local = { ...tab };
      if (local.ai && !details.user) {
        local.lock = true;
      } else if(local.user && !details.users) {
        local.lock = true;
      }
      return { ...local};
    }).filter((item) => {
      if (system.hideAi && item.id === 'ai') return false;
      return true;
    });
  });
  const [isFileUpload, setIsFileUplaod] = useState(false);  

  const [body, setBody] = useState({});
  const [requiredBody, setRequiredBody] = useState({});
  const [optionalBody, setOptionalBody] = useState({});
  const [openView, setOpenView] = useState({}); 

  const [language, setLanguage] = useState('curl');

  const [query, setQuery] = useState({});
  const [viewHydration, setViewHydration] = useState(false); // [viewHydration]
  useEffect(() => {
    if (window.localStorage) {
        const language = window.localStorage.getItem('language');
        if (language) {
            setLanguage(language);
            const lquery = { ...query };
            const { buildUrl, displayUrl, responseType } = getUrl(details, api, lquery);
            lquery.buildUrl = buildUrl;
            lquery.displayUrl = displayUrl;
            lquery.responseType = responseType;
            lquery.snippet = generate(lquery.buildUrl, language, api.method, null, { responseType: lquery.responseType }, {provider: details.id, ...api});
            setQuery(lquery);
            console.log('setQuery 4')
        }
    }
  }, []);

  useEffect(() => {
    if (query) {
      const localState = { ...query };
      const { buildUrl, displayUrl, responseType  } = getUrl(details, api, localState);
      localState.buildUrl = buildUrl;
      localState.displayUrl = displayUrl;
      localState.responseType = responseType;
      localState.snippet = generate(buildUrl, language, api.method, body, { responseType: localState.responseType }, {provider: details.id, ...api});
  
      setQuery(localState);
      // setQuery({});
      // setApiData({ data: {} });
    }
  }, [details]);
  
  useEffect(() => {
      let body = {}
      const postType = ["POST", "PATCH", "PUT", "DELETE"].includes(api.method);
      if (postType && api.provider_presets) {
        if (api.provider_presets.body) {
          body = { ...api.provider_presets.body }
        } else {
          body = { ...api.provider_presets }
        }
      }

      let requiredBody = { };
      let optionalBody = { };
      if (api.provider_presets && api.provider_presets.definition) {
        Object.keys(api.provider_presets.definition).forEach(key => {
          // console.log('api.provider_presets.definition[key]', api.provider_presets.definition[key], api.provider_presets.body[key]);
          let value = api.provider_presets.body[key];

          if (api.provider_presets.definition[key].type === 'number') {
            value = value ? value : 0
          } else if (api.provider_presets.definition[key].type === 'object') {
            value = value ? value : {}
          } else if (['array of object', 'object', 'array of string'].includes(api.provider_presets.definition[key].type)) {
            value = value ? value : []
          } else if (api.provider_presets.definition[key].type === 'enum') {
            value = value ? value : api.provider_presets.definition[key].enum.join(" | ");
          } else if (api.provider_presets.definition[key].type === 'string') {
            value = value ? value : ""
          }
          if (api.provider_presets.definition[key] && api.provider_presets.definition[key].required) {
            requiredBody[key] = value;
          } else {
            optionalBody[key] = value;
          }
        });
        setRequiredBody({ ...requiredBody });
        setOptionalBody({ ...optionalBody });
      }

      if (cachedPayload.body && Object.keys(cachedPayload.body).length) {
        setBody({ ...cachedPayload.body });
      } else {
        const prefillBody  = Object.keys(requiredBody).length ? requiredBody : optionalBody;
        setBody({ ...prefillBody });
      }

      setIsPostRequest(postType);

      const localState = { };
      const { buildUrl, displayUrl, responseType  } = getUrl(details, api, localState);
      localState.buildUrl = buildUrl;
      localState.displayUrl = displayUrl;
      localState.responseType = responseType;
      localState.snippet = generate(buildUrl, language, api.method, body, { responseType: localState.responseType }, {provider: details.id, ...api});
      
      // Resetting form params
      if (api.query_params && api.query_params.length) {
        let params = api.query_params.map((item) => item.name);

        params.forEach(item => {
          localState[item] = ''
        });
      }
      if (cachedPayload.query) {
        setQuery({ ...cachedPayload.query });
      } else {
        setQuery(localState);
      }
  }, [api]);

  useEffect(() => {
    const tabs = secondHalfDefaultTabs.map(tab => {
      const local = { ...tab };
      if (local.ai && !details.user) {
        local.lock = true;
      } else if(local.user && !details.user) {
        local.lock = true;
      }
      return { ...local};
    }).filter((item) => {
      if (system.hideAi && item.id === 'ai') return false;
      return true;
    });
    setSecondHalfTabs(tabs);
  }, [system.hideAi])

  useEffect(() => {
    if (language) {
      const lquery = { ...query };
      const { buildUrl, displayUrl, responseType } = getUrl(details, api, lquery);
      lquery.buildUrl = buildUrl;
      lquery.displayUrl = displayUrl;
      lquery.responseType = responseType;
      lquery.snippet = generate(lquery.buildUrl, language, api.method, null, { responseType: lquery.responseType }, {provider: details.id, ...api});
      setQuery(lquery);
    }
  }, [language]);

  const onToggleFullKeysView = (key) => {
    const localFullKeysView = { ...fullKeysView };
    localFullKeysView[key] = !localFullKeysView[key];
    setFullKeysView({ ...localFullKeysView });
  };
  const onClickToggleViewHydration = (showView) => {
      setViewHydration(showView);

      if (showView) {
        getHydrationData();
      }
  }
  const onQueryChange = param => {
    const { name, value } = param.target;
    const lquery = { ...query };
    console.log('onQueryChange', name, value);
    lquery[name] = value.trim();
    const {buildUrl, displayUrl, responseType} = getUrl(details, api, lquery);
    lquery.buildUrl = buildUrl;
    lquery.displayUrl = displayUrl;
    lquery.responseType = responseType;
    lquery.snippet = generate(lquery.buildUrl, language, api.method, null, { responseType: lquery.responseType }, {provider: details.id, ...api});
    setQuery(lquery);
    onChangeCachePayload({ query: lquery, body });
  };

  const onFormDataChange = param => {
    const { name, value, files } = param.target;
    const lb = { ...body };
    if (files && files.length) {
      lb[name] = files[0];
      setIsFileUplaod(true);
    } else {
      lb[name] = value;
    }
    setBody(lb);
    onChangeCachePayload({ query, body: lb });
  };

  const onClickResetPayload = () => {
    const prefillBody  = Object.keys(requiredBody).length ? requiredBody : optionalBody;
    setBody({ ...prefillBody });
    onChangeCachePayload({ query, body: prefillBody });
  }

  const onClickFullPayload = () => {
    setBody({ ...requiredBody, ...optionalBody });
    onChangeCachePayload({ query, body: {...requiredBody, ...optionalBody } });
  }

  const itemType = {
    string: '',
    number: 0,
    boolean: false,
    object: {},
    array: [],
    null: null,
    undefined: '',
    'array of object': [{}],
    enum: ''
  }
  const onClickAddToBody = (item, type, value) => {
    const lb = { ...body };
    if (value) {
      lb[item] = value
    } else {
      lb[item] = itemType[type];
    }
    setBody({ ...lb });
  }
  const onClickRemoveFromBody = (item, required) => {
    if (required) return;
    const lb = { ...body };
    delete lb[item];
    setBody({ ...lb });
  }

  const canBeVisible = (api) => {
    return api.path_params && api.path_params.length || api.query_params && api.query_params.length ||
    api.form_data && api.form_data.length ||
    api.provider_presets && api.provider_presets.body && Object.keys(api.provider_presets.definition).length
  }
  const onBodyChange = (editor, data, value) => {
    try {
      const lv = JSON.parse(value);
      const lb = { ...lv };
      const lquery = { ...query };

      setBody(lb);
      lquery.snippet = generate(lquery.buildUrl, language, api.method, lb, { responseType: lquery.responseType }, {provider: details.id, ...api});
      setQuery(lquery);
      // setView({display: {  }, type: ''});
      onChangeCachePayload({ query: lquery, body: lb });
    } catch (e) {
      console.log(e);
    }
  };
  const onSaveUsersIntentPayload = () => {
    if (saveUsersIntentPayload) {
      saveUsersIntentPayload({
        body,
        query_params: { ...query, buildUrl: undefined, displayUrl: undefined, snippet: undefined, responseType: undefined},
        headers: {},
        path_params: {}
      });
    }
  }
  const onFetchDataClick = () => {
    const params  = {
      url: query.buildUrl,
      method: api.method,
      headers: {},
    };
    
    // Quick hack to get binary response
    if (query.responseType || api.response_type) {
      params.responseType = 'blob';
    }

    if (isPostRequest) {
      if (isFileUpload) {
        const formData = new FormData();
        Object.keys(body).forEach((item) => {
          formData.append(item, body[item]);
        });
        params.data = formData;
      } else {
        params.data =body ||  {}
      }
    }

    onClickTryIntentEndpoint({ ...params });
  };

  const onLanguageSelect = (e) => {
    const { value} = e.target;
    setLanguage(value);
    if (window && window.localStorage) {
        window.localStorage.setItem('language', value);
    }
  }

  const onPayloadSelect = (e) => {
    const { value} = e.target;
    if (!value) {
      let pl = {}
      if (api.provider_presets) {
        if (api.provider_presets.body) {
          pl = { ...api.provider_presets.body }
        } else {
          pl = { ...api.provider_presets }
        }
        setBody({ ...pl }, api);
      }
      return;
    }; 
    try {
      const payload = JSON.parse(value);
      setBody(payload.body);
      const lquery = { ...query, ...(payload.query_params || {}), };
      const {buildUrl, displayUrl, responseType} = getUrl(details, api, lquery);
      lquery.buildUrl = buildUrl;
      lquery.displayUrl = displayUrl;
      lquery.responseType = responseType;
      lquery.snippet = generate(lquery.buildUrl, language, api.method, null, { responseType: lquery.responseType }, {provider: details.id, ...api});
      setQuery(lquery);
    } catch(e) {
      console.log(e);
    }
  }

  const onClickCloseOpenView = () => {
    setOpenView({
      snippet: false,
      description: false
    });
  }

  return (
    <div className="w-full">
      <div className='bg-gray-100 transition-all duration-300 delay-150'>
        <div className='transition-all duration-300 delay-150'>
          <div className="md:flex md:justify-between items-center p-2 rounded-tl-md rounded-tr-md">
            <div className="relative md:flex md:justify-between items-center text-xs bg-gray-200 px-2 md:w-10/12 rounded border border-gray-200">
              <span className='flex overflow-hidden'>
                <span className=' bg-gra-100 p-2 -ml-2 rounded-tl-md rounded-bl-md border-r border-gray-300'>
                  <HTTPMethodLabel name={api.method || ''} />
                </span>
                <div className='bg-gray-200 p-2 mr-1 rounded-tr-md rounded-br-md w-[825px] overflow-hidden truncate'>{maskToken(query.displayUrl)}</div>
              </span>
            </div>
            {requestWait ? (
              <span className='mr-2'>
                <IconPack name='spin' size='w-2 h-2' />
              </span>
            ) : (
              <div className='flex space-x-4'>
                {
                  details.is_public_api || details.api_token ?  
                  <>               
                      {
                        details.ready || details.ignore? <div className='md:flex md:justify-between items-center'>
                          <button
                            type="button"
                            className="hover:shadow-md text-xs text-white py-2 px-4 rounded bg-blue-500 uppercase"
                            onClick={() => onFetchDataClick(api)}
                          >
                            {i18n.request_btn_txt || 'Send'}
                          </button> 
                        </div> : null
                      }
                  </>
                  : <div className=''>
                    {
                      details.user ? <>
                        <Link
                          href="/settings"
                          title='Generate api token for your account'
                          className="flex items-center text-xs text-gray-700 py-2 px-4 rounded bg-gray-300"
                        >
                          <span title={'Generate api token for your account '}>
                            <IconPack name="warn"/>
                          </span>
                          <span className='ml-1'>
                          {i18n.request_btn_txt || 'Generate'}
                          </span>
                        </Link> 
                      </> : null
                    }
                  </div>
                }
                <div className='py-2 px-4 flex items-center gap-4 text-xs text-gray-700'>
                  <button onClick={() => { console.log(true); setOpenView({ snippet: false, description: true})}} className="flex items-center text-xs text-gray-700">
                    <IconPack name={'bars'} />
                  </button>
                  <button onClick={() => { console.log(true); setOpenView({ snippet: true, description: false})}} className="flex items-center text-xs text-gray-700 ">
                    <IconPack name={'code'} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-10 gap-4 border-t border-gray-200 text-xs pb-4 min-h-[400px]" >
            <div className={`col-span-6 p-4  border-r border-gray-200`}>
              <div className='h-full'>
                <div className='h-full overflow-scroll'>

                  {
                    details.user && canBeVisible(api)
                    ? <>
                    <div className='flex items-center justify-end gap-1'>
                      <button className='border p-1 px-1.5 border-gray-300 rounded-md bg-white hover:bg-gray-100' onClick={onClickResetPayload}>Reset Payload</button>
                      <button className='border p-1 px-1.5 border-gray-300 rounded-md bg-white hover:bg-gray-100' onClick={onClickFullPayload}>Full Payload</button>
                      
                      <button className={`border p-1 px-1.5 rounded-md  ${viewHydration ? 'bg-gray-100 border-gray-200 shadow-xs': 'bg-white border-gray-300 hover:bg-gray-100'}`} onClick={() => !viewHydration ? onClickToggleViewHydration(true): null }>Choose Payload</button>
                      
                      {
                        !api.home && saveAllowed ? <button onClick={onSaveUsersIntentPayload} className='border border-gray-300 bg-white p-1 px-1.5 rounded-md hover:bg-gray-100' title='Save this payload for future use'>Save</button> : null
                      }
                    </div>             
                    </> : null
                  }
                  {api.path_params && api.path_params.length ? (
                    <div className="text-xs mb-4">
                      <div className="flex justify-between">
                        <span className={`p-1 pl-0 font-semibold uppercase`}>Path Parameters <small className='text-gray-600 bg-gray-200 p-1 px-3 rounded-xl ml-1'>{api.path_params.length}</small></span>
                        <span className={`p-1 pl-0`}></span>
                        {/* {
                          !api.home && saveAllowed ?
                            <button onClick={onSaveUsersIntentPayload} className='border border-gray-200 bg-white p-1 px-1.5 rounded-md' title='Save this payload for future use'>Save</button>
                          : null
                        } */}
                      </div>
                      <div className="my-4">
                        <FormUI
                          query={query}
                          fields={api.path_params}
                          onChange={onQueryChange}
                          meta={{}}
                        />
                        <div className='mt-4 text-xs text-gray-600'>
                          <p>The path parameters will be sent as a <span className='font-semibold'>URL query parameters</span> as a part of the request.</p>
                        </div>
                      </div>
                    </div>
                  ) : <></>
                  }
                  {api.query_params && api.query_params.length ? (
                    <div className="text-xs mb-4">
                      <div className="flex justify-between">
                        <span className={`p-1 pl-0 font-semibold uppercase`}>Query Parameters <small className='text-gray-600 bg-gray-200 p-1 px-3 rounded-xl ml-1'>{api.query_params.length}</small></span>
                        <span className={`p-1 pl-0`}></span>
                        {/* {
                          !api.home && saveAllowed ?
                            <button onClick={onSaveUsersIntentPayload} className='border border-gray-200 bg-white p-1 px-1.5 rounded-md' title='Save this payload for future use'>Save</button>
                          : null
                        } */}
                      </div>
                      <div className="my-4">
                        <FormUI
                          query={query}
                          fields={api.query_params}
                          onChange={onQueryChange}
                          meta={{}}
                        />
                        <div className='mt-4 text-xs text-gray-600'>
                          <p>The query parameters will be sent as a <span className='font-semibold'>URL query parameters</span> as a part of the request.</p>
                        </div>
                      </div>
                    </div>
                  ) : <>
                    {/* <div className="text-xs mb-4">
                      <div className="flex justify-between">
                        <span className={`p-1 pl-0 font-semibold`}>Query Parameters</span>
                        <span className={`p-1 pl-0`}></span>
                      </div>
                      <div className="mt-4 p-4 flex justify-between items-center text-xs rounded-md bg-white/50 border-2 border-gray-300 border-dashed">
                        <span className='text-gray-500'>No query parameters required</span>
                      </div>
                    </div> */}
                  </>
                  }
                  {api.form_data && api.form_data.length ? (
                    <div className="text-sm">
                      <div className='mb-4'>
                        <div className="text-xs pb-2 flex justify-between uppercase">
                          <span className={`p-1 pl-0 font-semibold`}>Multipart Body</span>
                        </div>
                      </div>
                      <div className="my-4">
                        <FormUI
                          query={query}
                          fields={api.form_data}
                          onChange={onFormDataChange}
                          meta={{}}
                        />
                        <div className='mt-4 text-xs text-gray-600'>
                          <p>The payload will be sent as a <span className='font-semibold'>multipart/form-data</span> as a part of the request body.</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {(api.provider_presets && api.provider_presets.body && Object.keys(api.provider_presets.definition).length) ? (
                    <div className="text-sm mb-6 ">
                      <div className="text-xs flex items-center justify-between">
                        <span className={`p-1 pl-0 font-semibold uppercase`}>Request Payload</span>
                      </div>
                      <div>
                        <div className='rounded-md border border-gray-900 mt-4'>
                          <CodeEditor
                            value={JSON.stringify(body, null, 2)}
                            onChange={onBodyChange}
                          />
                        </div>
                        <div className='mt-4 text-xs text-gray-600'>
                          <p>The payload will be sent as a <span className='font-semibold'>application/json</span> as a part of the request body.</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  { canBeVisible(api) ?
                    <div className='h-[250px] overflow-scroll border border-gray-200 rounded-md p-4'>
                    {
                      api.path_params && api.path_params.length?
                        <>
                          <div className={`text-xs mb-4`}>
                            <div className="text-xs flex justify-between">
                              <span className={`p-1 pl-0 mb-2 font-semibold uppercase`}>Path Parameters</span>
                            </div>
                            <div className='ml-4'>
                            {
                            api.path_params.map((item) => (<div key={item.label} className='mb-2 '>
                              <div className=' pt-0.5 text-xs  text-gray-900  items-top  leading-relaxed'>
                                <span className='mb-1 font-medium'>  
                                  {item.label} 
                                  {item.required ? <sup className='text-red-500 ml-0.5 text-[11px]'>*</sup> : null}
                                </span>
                                <small className='ml-2 text-orange-700 rounded-2xl pt-0.5 px-0.5' style={{fontSize: '70%'}}>{item.type}</small>
                              </div>
                              <div className=' leading-relaxed pt-0.5  text-gray-600'>
                                {item.description}
                              </div>
                            </div>))
                            }
                            </div>
                          </div>
                        </> : null
                    }
                    {
                      api.query_params && api.query_params.length?
                        <>
                          <div className={`text-xs mb-4`}>
                            <div className="text-xs flex justify-between">
                              <span className={`p-1 pl-0 mb-2 font-semibold uppercase`}>Query Parameters</span>
                            </div>
                            <div className='ml-4'>
                            {
                            api.query_params.map((item) => (<div key={item.label} className='mb-2 '>
                              <div className=' pt-0.5 text-xs  text-gray-900  items-top  leading-relaxed'>
                                <span className='mb-1 font-medium'>  
                                  {item.label} 
                                  {item.required ? <sup className='text-red-500 ml-0.5 text-[11px]'>*</sup> : null}
                                </span>
                                <small className='ml-2 text-orange-700 rounded-2xl pt-0.5 px-0.5' style={{fontSize: '70%'}}>{item.type}</small>
                              </div>
                              <div className=' leading-relaxed pt-0.5  text-gray-600'>
                                {item.description}
                              </div>
                            </div>))
                            }
                            </div>
                          </div>
                        </> : null
                    }
                    {
                      api.form_data && api.form_data.length?
                        <>
                          <div className={`text-xs mb-4`}>
                            <div className="text-xs flex justify-between">
                              <span className={`p-1 pl-0 mb-2 font-semibold uppercase`}>Form Data</span>
                            </div>
                            <div className='ml-4'>
                            {
                              api.form_data.map((item) => (<div key={item.label} className=' mb-2 '>
                                <div className=' pt-0.5 text-xs text-gray-900 items-top  leading-relaxed'>
                                  <span className='font-medium'>   {item.label} </span>
                                  <small className='ml-1 text-orange-700 rounded-2xl pt-0.5 px-0.5' style={{fontSize: '70%'}}>{item.type}</small>
                                </div>
                                <div className=' leading-relaxed pt-0.5 text-gray-600'>
                                  {item.description}
                                </div>
                              </div>))
                              }
                            </div>
                          </div>
                        </> : null
                    }
                    {
                      api.provider_presets && api.provider_presets.body && Object.keys(api.provider_presets.definition).length?
                        <>
                          <div className={`text-xs mb-4`}>
                            <div className="text-xs flex justify-between">
                              <span className={`p-1 pl-0 mb-2 font-semibold uppercase`}>Payload</span>
                            </div>
                            <div className='ml-4'>
                            {
                            Object.keys(api.provider_presets.definition).map((item) => (<div key={item} className={`mb-2`}>
                              <div className='flex justify-between text-xs text-gray-900 items-top pt-0.5 text-sm leading-relaxed'>
                                <div>
                                  <span className='font-medium'>{item}</span> 
                                  <small className='ml-1 text-orange-700 rounded-2xl pt-0.5 px-0.5' style={{fontSize: '80%'}}>{api.provider_presets.definition[item].type}</small>
                                  {api.provider_presets.definition[item].required ? <sup className='text-red-500 ml-0.5 text-[11px]'>*</sup> : null}
                                </div>
                                <div>
                                  {
                                    !api.provider_presets.definition[item].required ?  <button onClick={() => item in body ? onClickRemoveFromBody(item, api.provider_presets.definition[item].required) : onClickAddToBody(item, api.provider_presets.definition[item].type, api.provider_presets.body ? api.provider_presets.body[item]: '')} className={` ${item in body ? 'text-red-500': 'text-gray-500'}`}>
                                      <IconPack name={item in body ? "remove" : "add"} />
                                    </button> : null
                                  }
                                </div>
                              </div>
                              <div className='leading-relaxed text-gray-600 text-xs'>
                                {api.provider_presets.definition[item].description}
                              </div>
                            </div>))
                            }
                            </div>
                          </div>
                        </> : null
                    }
                    </div>
                  : null}
                </div>  
              </div>
            </div>
            <div className={`col-span-4 p-4 pl-0 `}>
              <div className='h-full overflow-scroll'>
                  {children}
              </div>
            </div>
          </div>
        </div>
      </div>
      { openView.snippet ? <div className="w-full fixed left-0 top-0 right-0 bottom-0 bg-gray-800/70 z-10 -mt-4 ">
        <div className='h-full flex '>
          <div className='w-1/2 h-full' onClick={() => onClickCloseOpenView()}></div>
          <div className='w-1/2 h-full bg-gray-50 flex overflow-scroll p-4 pr-0 pb-0 float-right border-l border-gray-100 shadow-[0_0_20px_rgba(0,0,0,0.25)]'>
            <div className='w-full flex'>
              <div className='pr-4 overflow-hidden flex-grow'>
                <div className="text-xs mb-4 py-4">
                  <span className={`p-1 pl-0 font-semibold`}>Snippet</span>
                  <button onClick={() => onClickCloseOpenView()} className='float-right mt-2'>
                    <IconPack name='close' />
                  </button>
                </div>
                <div className='w-full overflow-scroll'>
                  <CodeSnippet 
                    codeMap={codeMap} 
                    language={language} query={query} user={details.user} 
                    enabled={true} // enabled={apiData.data}
                    readOnly={true}
                    onClickCloseSnippetView={onClickCloseOpenView}
                    onLanguageSelect={onLanguageSelect} 
                  />
                </div>
              </div>
            </div>
            
          </div>
          <div onClick={onClickCloseOpenView} className='w-12  flex bg-white/60 flex-col items-center'>
          </div>
        </div>
      </div> : null}

      {/* -------------------- */}
      { openView.description ? <div className="w-full fixed left-0 top-0 right-0 bottom-0 bg-gray-800/70 z-10 -mt-4 ">
        <div className='h-full flex'>
        <div className='w-1/2 h-full' onClick={() => onClickCloseOpenView()}></div>
        <div className='w-1/2 bg-gray-50 flex h-full overflow-scroll p-4 pr-0 pb-0 float-right border-l border-gray-100 shadow-[0_0_20px_rgba(0,0,0,0.25)]'>
            <div className='pr-4 overflow-hidden flex-grow'>
              <div className="text-xs mb-4 py-4">
                <span className={`p-1 pl-0 font-semibold`}>Details</span>
                <button onClick={onClickCloseOpenView} className='float-right mt-2'>
                  <IconPack name='close' />
                </button>
                
              </div>
              <div className='w-full overflow-scroll text-xs'>
                <ApiDescription api={api} view={'description'} />
              </div>
            </div>
          </div>
          <div onClick={onClickCloseOpenView} className='w-12  flex flex-col bg-white/60 items-center'>
          </div>
        </div>
      </div> : null}
      {
        viewHydration && hydration_map ? 
          <div className='w-1/3 fixed top-0 right-0 bottom-0 bg-white z-10 p-6 border-l border-gray-100'>
            <button onClick={() => onClickToggleViewHydration(false)} className='float-right'>
              <IconPack name='close' />
            </button>
            <div className=''>
              <div className=''>
                  { 
                    Object.keys(hydration_map).map((hydrate_from) => <div key={hydrate_from} className='text-xs mb-2 pb-4 border-b border-gray-100'>
                        {
                          hydration_map[hydrate_from].length ? <>
                            <div>
                              <h2 className={`p-1 pl-0 text-medium uppercase font-medium`}>{capitalize_text(hydrate_from).text} ({hydration_map[hydrate_from].length})</h2>
                              <p className='my-2 text-purple-600'>{capitalize_text(hydrate_from).info}</p>
                            </div>
                            <div className={`mt-4 grid grid-cols-4 gap-2 ${ hydration_map[hydrate_from].length > 8 ? 'h-[250px] overflow-y-scroll': ''}`}>
                              {
                                hydration_map[hydrate_from].map((payload, index) => <>
                                  <button key={index} onClick={() => onPayloadSelect({ target: { value: JSON.stringify(payload) }})} className='w-full border border-gray-200 rounded-md p-1.5 py-2 text-gray-700'>
                                    {payload.name || capitalize_text(hydrate_from).name} {index + 1}
                                  </button></>)
                              }
                            </div>
                          </> : <>
                            <div>
                              <h2 className={`p-1 pl-0 text-medium uppercase font-medium`}>{capitalize_text(hydrate_from).text}</h2>
                              <p className='my-2 text-gray-400'>{capitalize_text(hydrate_from).empty}</p>
                            </div>
                          </>
                        }
                      </div>)
                  }
                </div> 
            </div>
          </div> 
        : <div className=''></div>
        }
    </div>
  );
}

API_IntentView.propTypes = {
  i18n: PropTypes.object,
  details: PropTypes.object,
  api: PropTypes.object,
};

export default memo(API_IntentView);
