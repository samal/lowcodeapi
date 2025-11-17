import CryptoJS from 'crypto-js';
import sanitize from '@/utils/sanitize';

const fieldType = {
    file: 'file',
    string: 'input',
    number: 'input',
    array: 'list',
    boolean: 'radio',
    enum: 'list'
}
function processPath(data, provider, filter = [], selected) {
    let dataObj = {};
    const paths = Object.keys(data.paths);
    let total = 0;

    paths.forEach((item) => {
        const methods = Object.keys(data.paths[item]);
        methods.forEach((method) => {
            total = total + 1;
            const obj = {
                method: method.toUpperCase(),
                route_name: item,
                is_public: !data.paths[item][method].security.length,
                ...data.paths[item][method],
            };
            if (obj.parameters && obj.parameters.length) {
                obj.query_params = [];
                obj.path_params = [];
                obj.parameters.forEach(itemp => {
                    const local =  { ...itemp, type: itemp.schema.type || itemp.type || ''};
                    local.label = local.label || local.name;
                    local.message = local.message || local.description || ''
                    if (local && local.schema && local.schema.type) {
                        local.field = fieldType[local.schema.type] || null;
                    } else {
                        console.info('schema.type missing or empty', item, local)
                    }

                    if (local.field === 'radio' && local.schema.items) {
                        local.default_value = local.schema.items.enum.join(',');
                    }
                    if (local.field === 'list' && local.schema.items && local.schema.items.enum) {
                        local.suggestions= local.schema.items.enum.join(',');
                        local.dropdownList = local.schema.items.enum.map (i => ({
                            key: i,
                            value: i,
                            label: i
                        }));
                    }

                    if (local.in === 'path') {
                        obj.path_params.push(local);
                    } else {
                        obj.query_params.push(local);
                    }
                });
            }
            if (obj.requestBody) {
                if ( obj.requestBody.content['application/json']) {
                    obj.provider_presets = {
                        body: obj.requestBody.content['application/json'].example,
                        definition: obj.requestBody.content['application/json'].schema.properties
                    }
                } else if (obj.requestBody.content['multipart/form-data']) {
                    obj.form_data = Object.keys(obj.requestBody.content['multipart/form-data'].schema.properties).map((item) => {
                        const local = obj.requestBody.content['multipart/form-data'].schema.properties[item];
                        local.name = item;
                        local.label = item;
                        local.message = local.message || local.description || ''
                        local.field = fieldType[local.type] || null;

                        if (local.field === 'radio') {
                            local.default_value = local.enum ? local.enum.join(','): '';
                        }
                        return local;
                    });
                }
            }

            if (obj.tags && obj.tags.length) {
                const tag = obj.tags[0];
                if(dataObj[tag]) {
                    dataObj[tag].push(obj);
                } else {
                    dataObj[tag] = [obj];
                }
            }
            obj.route_name = item;
            obj.hash = CryptoJS.MD5(`${provider}.${method.toUpperCase()}./${provider}${item}`).toString();
            // obj.hashtxt = `${provider}.${method.toUpperCase()}./${provider}${item}`;
            obj.endpoint = obj.externalDocs.api_endpoint;
        });
    });

    const category = Object.keys(dataObj);

    const details = {
        ...data.info,
        service_url : data.servers[0].url,
        api_security: data.components && data.components.securitySchemes.ApiToken.name,
    }

    let navPath = [{ ...selected, path: `/${selected.id}`}];
    let urlPath = null;
    let filteredApiListObj = {};
    const originalAPIListObj = { ...dataObj };
    const categoryKeys = Object.keys(originalAPIListObj).map(item => sanitize(item));
    const categoryKeysMap = {};
    

    // This is used for mapping sinitized key to regular text
    Object.keys(originalAPIListObj).forEach(item => { 
        const key = sanitize(item);
        categoryKeysMap[key] = item 
    });


    if (filter && filter.length === 1) {
        let filteredCategory = filter.shift();
        filteredCategory = sanitize(filteredCategory);
        const categoryName = categoryKeysMap[filteredCategory];
        if (categoryKeys.includes(filteredCategory) && originalAPIListObj[categoryName]) {
            filteredApiListObj[categoryName] = originalAPIListObj[categoryName];
            total = originalAPIListObj[categoryName].length;        
            navPath.push({
                id: filteredCategory,
                name: categoryName,
                path: `/${selected.id}/${filteredCategory}`
            })
        }
    } else {
        const filterPath = `/${filter.join('/').split('~')[0]}`;
        const filterMethod = `${filter.join('/').split('~')[1]}`;

        urlPath = filter.join('-');
        // console.log(filteredApiListObj, 'filteredApiListObj', urlPath)

        if (paths.includes(filterPath)) {
            paths.forEach(item => {
                const extract = data.paths[item];
                const list = Object.keys(extract).filter(key => filterMethod.toLowerCase() === key.toLowerCase());
                list.forEach(item => {
                    const categories = extract[item].tags;
                    categories.forEach(cat => {
                        const id = sanitize(cat);
                        navPath.push({
                            id: id,
                            name: cat,
                            path: `/${selected.id}/${id}`
                        })
                    })
                    navPath.push({
                        id: urlPath,
                        name: extract[item].summary,
                        path: `/${selected.id}/${urlPath}`
                    });
                })
            });
        }
        if (urlPath) {
            // // console.log('urlPath', urlPath,key, categoryKeysMap[key], filteredApiListObj[categoryKeysMap[key]]);
            // filteredApiListObj[categoryName] = filteredApiListObj[categoryName].filter((filteredObj) => {
            //     // console.log(filteredObj.route_name.replace('/','').replaceAll('/', '-'), urlPath, filteredObj.route_name.replace('/','').replaceAll('/', '-') === urlPath);
            //     return filteredObj.route_name.replace('/','').replaceAll('/', '-') === urlPath;
            // });
            // navPath.push({
            //     id: urlPath,
            //     name: filter.join(' '),
            //     path: `/${selected.id}/${urlPath}`
            // });
        }   
    }
    const pageNav = {
        showCategory: true
    }
    if (Object.keys(filteredApiListObj).length) {
        dataObj = filteredApiListObj;
        // pageNav.showCategory = false;
    }
    // details.pageNav = pageNav;
    // console.log({ details }, data.servers, category, navPath);
    return {
        breadcrumbs: navPath,
        category,
        apiList: dataObj,
        details,
        total,
    }
}

export default processPath;