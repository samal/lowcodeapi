import axios from 'axios';
import queryString from 'query-string';

import getAPIEndpoints from './constants';

export default async({ BUILD_PROVIDERS } = {}) => {
    const info = {
        "name"          : process.env.NAME          || '{name}',
        "copyright"     : process.env.COPYRIGHT     || 'LowCodeAPI',    
        "title"         : process.env.TITLE         || '{title}',
        "description"   : process.env.DESCRIPTION   || '',
        "url"           : process.env.WEBSITE_URL   || '',
        "author"        : process.env.AUTHOR        || '',
        "author_link"   : process.env.AUTHOR_LINK   || '',
        "show_legal"    : process.env.SHOW_LEGAL    || '',
        "copyright_link" : process.env.COPYRIGHT_LINK     || '',    
    }
    
    const DATA_ENDPOINT = process.env.DATA_ENDPOINT;
    const DEBUG = process.env.DEBUG;

    if (!DATA_ENDPOINT) throw `DATA_ENDPOINT is undefined.`;

    const DISCLAIMER = process.env.DISCLAIMER || '';
    const COMMIT_HASH = process.env.GIT_LAST_COMMIT_HASH || '';
    const BUILD_FOR = process.env.BUILD_FOR || '';
    const BUILD_DATE = process.env.BUILD_DATE || '';
    const BUILD_ID = process.env.BUILD_ID || '';
    const BUILD_FOR_USER = process.env.BUILD_FOR_USER || '';
    const BUILD_MESSAGE = process.env.BUILD_MESSAGE || '';
    const BUILD_DEV_MESSAGE = process.env.BUILD_DEV_MESSAGE || '';
    const GENERATED_MESSAGE = process.env.GENERATED_MESSAGE || '';
    const GENERATED_BY      = process.env.GENERATED_BY || '';
    const DISABLE_PROVIDER_LINK = process.env.DISABLE_PROVIDER_LINK || false;

    const UI_DOMAIN = process.env.UI_DOMAIN || 'http://localhost:3000';
    const APP_ENDPOINT = process.env.APP_URL || '';
    const API_URL = process.env.API_URL || '';
    const STORE = process.env.STORE || '';
    const SKIP_PROVIDER_BASE_PATH = process.env.SKIP_PROVIDER_BASE_PATH || false;

    let heroList = [];
    let authList = [];

    let DISABLE_TABS = process.env.DISABLE_TABS || false;
    let DISABLE_FEATURE = { };
    
    if (process.env.DISABLE_UI_FEATURE && process.env.DISABLE_UI_FEATURE.trim()) {
        process.env.DISABLE_UI_FEATURE.split(',').forEach(item => { 
            DISABLE_FEATURE[item.trim()] = true 
        });
        DISABLE_TABS = true;
    }

    // TODO: Clean on build
    const extra_options = {
        DISCLAIMER,
        BUILD_MESSAGE,
        BUILD_DEV_MESSAGE,
        GENERATED_MESSAGE,
        BUILD_FOR_USER,
        GENERATED_BY,
        COMMIT_HASH,
        BUILD_DATE,
        BUILD_ID,
        BUILD_FOR,
        DISABLE_PROVIDER_LINK,
        STORE,
        SKIP_PROVIDER_BASE_PATH,
        disable_tabs: DISABLE_TABS,
        DISABLE_FEATURE,
    }
    const api_endpoints = getAPIEndpoints({ UI_DOMAIN, APP_ENDPOINT });

    let providers = null;
    
    // console.log(`COMMIT_HASH: ${COMMIT_HASH}`);
    const options = {}
    options.filter = 'total_api,auth_type,description,category,api_endpoint,api_link_ref';
    options.skip = 'auth_config,scope,brand_color,brand_bg_color,brand_text_color,complexity,testing,alias_endpoint,col_width,brand_assets,og_title,og_tagline,display_order,sponsored';
    
    const { SKIP_ALL_PROVIDERS } = process.env;
    if (BUILD_PROVIDERS || process.env.BUILD_PROVIDERS) {
      try {
          providers = BUILD_PROVIDERS || process.env.BUILD_PROVIDERS;
          if (providers) {
              options.providers = providers.trim().toLowerCase();
          }
      } catch (e) {
          console.log(e, 'wrong provider format, format:one,two');
      }
    }
    const qs = queryString.stringify(options);
    const url = `${DATA_ENDPOINT}/api/v1/provider-list?${qs}`;
    try {
        DEBUG && console.log(`Fetching providers using ${url}`);
        const { data : providersResult } = await axios(url);
        const providersList = providersResult.res.map((item) => {
          return {
            id: item.id,
            name: item.name,
            description: item.description || '',
            credential_link: item.credential_link || '',
            api_endpoint: item.api_endpoint || '',
            api_link_ref: item.api_link_ref || '',
            auth_type: item.auth_type || '',
            category: item.category || '',
            total_api: item.total_api || '',
            released: item.released || false,
            logo_url: item.logo_url || '',
            updated_at: item.updated_at || '',
          }
        });
        let account_service = { login : { disable_google: true, disable_email: false } , signup : { disable_google: true, disable_email: false } }

        const config = {
            ...account_service,
            sidebar: providersList,
            navs: providersList,
            disable: account_service
        }
        const user = {
            loading: true,
        }

        const providers = providersList ? providersList.filter((item) => item) : [];

        const categories = [...new Set(providersList.map((p) => p.category).filter(i => !!i).sort())];
        const categoryIndex =  {}
    
        const providerGroup =  []

        providerGroup.push({
            id: 'others',
            name: 'Others',
            list: providersList,
        });

        providersList.forEach((provider) => {
            const { category } = provider;
            if (category) {
            if (categoryIndex[category]) {
                categoryIndex[category]  = categoryIndex[category] + 1;
            } else {
                categoryIndex[category] = 1;
            }
            }
        });
    
        const tabs = [];
          
        tabs.push({
            "id": "api-keys",
            "name": "API Token",
            "title": "Generate API Token",
            "disabled": false,
            "released": true,
            "visible": true
        });
        
        return {
            DEBUG,
            DATA_ENDPOINT,
            targetIntentsMap : {},
            info: {
                ...info, 
                ...extra_options,
                tabs
            },
            api_endpoints,
            endpoint: { 
                ...api_endpoints, 
                ui_base: api_endpoints.UI_DOMAIN,
                logo_base: api_endpoints.LOGO_BASE, 
                
                app_endpoint: APP_ENDPOINT,
                api_endpoint: API_URL,
                ui_domain: UI_DOMAIN,
            },
            config,
            categories : SKIP_ALL_PROVIDERS ? [] : categories,
            categoryIndex : SKIP_ALL_PROVIDERS ? {} : categoryIndex,
            providers : SKIP_ALL_PROVIDERS ? [] : providers,
            providerGroup,
            user,
            heroList,
            authList,
            distributions : []
        }
    } catch (e) {
        console.log('Failed fetching provider list', url);
        throw e;
    }

}