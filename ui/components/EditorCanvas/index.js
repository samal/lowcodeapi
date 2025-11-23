'use client';

import React, { useEffect, useState, useRef } from 'react';

import Link from 'next/link';
import Image from 'next/image';
import SplitPane from 'react-split';
import humanFormat from 'human-format';
import { Tooltip } from 'react-tooltip'

import getLogoUrl from '@/utils/logo-url';
import onLogout from '@/utils/logout';

import Footer from '@/components/Footer';
import UsersNav from '@/components/TopNew';
import NavRight from '@/components/NavRight';
import IconPack from '@/components/IconPack';
import HTTPMethodLabel from '@/components/HTTPMethodLabel';
import BadgeUI from '../BadgeUI';
import sdk from '../ExplorerView/lang/sdk';

const PaneView = ({ paneView = true, children, activeCategory, categoryMap = {}, permaCategory = {}, list, providersAll = [], selected, imgFallback, BASE_PATH, onError, activeView, currentView, setView, metrics, onSetCategory, onClickSetCurrentView }) => {

    if (!paneView) return children;
    const splitPaneRef = useRef(null);

    useEffect(() => {
        if (splitPaneRef.current) {
            splitPaneRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [splitPaneRef, providersAll]);

    return (<>
        <SplitPane 
            className='flex'
            sizes={[20, 80]}
            minSize={100}
            gutterSize={10}
            gutterAlign="center"
            snapOffset={30}
            dragInterval={1}
            direction="horizontal"
            cursor="col-resize"
        >
            <div className="md:block md:flex-none h-screen bg-gray-100 overflow-y-scroll w-[250px]">
                <div className=''>
                    {
                        providersAll.map((itemMap) => (
                            <div className='text-gray-800/80' key={itemMap.id}>
                                {
                                    itemMap.list && itemMap.list.length ? <>
                                        {/* <h2 className='mt-2 text-sm px-2 font-medium'>{itemMap.name}</h2> */}
                                        <div className={`${itemMap.id === 'featured' ? `py-2 mb-2` : ''}`}>
                                            {
                                                itemMap.list.map((item, index) => (
                                                    <div key={item.id} className={`text-gray-800/80 ${selected.id === item.id ? "bg-gray-100  " : ""}`} ref={selected.id === item.id ? splitPaneRef : null}>
                                                        <div className={`flex justify-between items-center `}>
                                                            <div className={`flex items-center justify-between py-1 px-2  w-full`}>
                                                                <div>
                                                                    <Link
                                                                        href={`${BASE_PATH}/${item.id}${permaCategory.providers ? `?providers=${selected.id === item.id ? permaCategory.providers.join(',') : `${selected.id},${permaCategory.providers.filter(p => p !== item.id).join(',')}`}`: ``}`}
                                                                        title={item.name}
                                                                        className={`flex items-center cursor-pointer text-sm truncate ml-1`}
                                                                        data-tip={item.name}
                                                                    >
                                                                        <>
                                                                            <Image src={getLogoUrl(imgFallback[item.id] || item.alias || item.id, { full_url: item.logo_url })}
                                                                                className={`w-4 h-4 mr-1.5 inline-block`}
                                                                                alt={item.name || ''}
                                                                                title={`${item.name}`}
                                                                                width={32}
                                                                                height={32}
                                                                                onError={(e) => onError(e, item.id)}
                                                                            />
                                                                            <span className={selected.id === item.id ? "text-gray-700 font-medium" : ""}>{item.name}</span>
                                                                        </>
                                                                    </Link>
                                                                </div>
                                                                <div className='text-xs flex items-center'>
                                                                    <small>{`${item.total_api} APIs`}</small>
                                                                    {
                                                                        item.id && metrics && metrics[item.id] && metrics[item.id].total ? <span className="ml-1.5 flex items-center font-medium bg-gray-200/70 border border-gray-300/50 px-1 text-gray-700 rounded-md" title={`This api is used ${humanFormat(metrics[item.id].total)} times`}>
                                                                            <span className=''>
                                                                                ⚡
                                                                            </span>
                                                                            <small className='ml-1'>{humanFormat(metrics[item.id].total)}</small>
                                                                        </span> : null 
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className='flex items-center'>
                                                                {/* {
                                                            selected.id === item.id ?  
                                                                <div className='bg-green-700/80 rounded-full mx-1 p-1'></div>
                                                            :  null
                                                        }
                                                        {
                                                            ['OAUTH2.0', 'OAUTH1.0', 'OAUTH1.0a'].includes(item.auth_type) ? <div className='mx-1 opacity-80' title={item.auth_type}>
                                                                <IconPack name="oauth" />
                                                            </div> : <div className='mx-1 opacity-80' title={item.auth_type}>
                                                                <IconPack name="key" />
                                                            </div>
                                                        } */}
                                                            </div>
                                                        </div>
                                                        {
                                                            selected.id === item.id ?
                                                                <ul className='text-xs pl-1 truncate'>
                                                                    {
                                                                        Object.keys(list).filter(item => activeCategory ? categoryMap[item.toLowerCase()] : true).map((item) => (<li key={item} className='block'>
                                                                            <div className='px-2 border-gray-200 '>
                                                                                <div className=''>
                                                                                    <div className={`relative  flex items-center cursor-pointer ${categoryMap[item.toLowerCase()] ? 'font-semibold' : 'font-medium'} my-1 truncate`} onClick={() => onSetCategory({ name: item.toLowerCase(), value: !categoryMap[item.toLowerCase()] })}>
                                                                                        <div className=''>
                                                                                            {
                                                                                                categoryMap[item.toLowerCase()] ? <IconPack name='chevronDown' /> : <IconPack name='chevronRight' />
                                                                                            }
                                                                                        </div>
                                                                                        <div className='flex-grow flex items-center  ml-1'>
                                                                                            {
                                                                                                <div className='w-full flex-grow flex justify-between items-center relative '>
                                                                                                    <div className={`mx-1 flex-grow truncate flex items-center justify-bet ${categoryMap[item.toLowerCase()] ? 'text-gray-900' : ''}`}>
                                                                                                        <span className='truncate ellipsis'>{item}</span>
                                                                                                        <small className='ml-1'>({list[item].length})</small>
                                                                                                    </div>
                                                                                                    <div className={`w-6 ml-1 p-1.5 py-1 pr-0 text-xs rounded-md font-medium text-gray-500 flex items-center`}>
                                                                                                        <Link href={`/${selected.id}?category=${item}`}><IconPack name='openLink'/></Link>
                                                                                                    </div>
                                                                                                </div>
                                                                                            }
                                                                                        </div>
                                                                                    </div>
                                                                                    {
                                                                                        categoryMap[item.toLowerCase()] ?
                                                                                            <ul className=' text-xs relative my-1 border-gray-200 pb-0.5 text-gray-600 list-disc truncate'>
                                                                                                <div className='w-[1px] h-[calc(100%-20px)] bg-gray-300 rounded-full absolute left-1 top-2'></div>
                                                                                                {
                                                                                                    list[item].map((route) => (<li key={`${route.method}.${route.route_name}`}
                                                                                                        className='block py-1 ml-2'
                                                                                                        onClick={() => onClickSetCurrentView(route)}
                                                                                                    >
                                                                                                        <div className='flex justify-between items-center'>
                                                                                                        <div className={`h-1.5 w-1.5 ml-1 rounded transition-all duration-200 ${currentView && (currentView.route_name === route.route_name && currentView.method === route.method)?' bg-green-500/90 rounded':null}`}></div>
                                                                                                            <div className='flex flex-grow justify-start items-center ml-2'>
                                                                                                                <div className={`w-40 flex items-center flex-grow justify-between truncate`} title={route.summary || route.description}>
                                                                                                                    <div className='flex-none w-6 mr-3 text-xs'>
                                                                                                                        <HTTPMethodLabel name={route.method} w="w-6" clip={true}/>
                                                                                                                    </div>
                                                                                                                    <div className={`w-4/5 ml-1.5 truncate border border-gray-100 ${currentView && (currentView.route_name === route.route_name && currentView.method === route.method) ? 'underline text-green-700/90' : 'underline cursor-pointer  hover:text-green-700/90'}`}>{route.summary || route.description}</div> 
                                                                                                                    <div className='text-xs'>
                                                                                                                        {
                                                                                                                            metrics[selected.id] && metrics[selected.id][route.hash] ? <span className="ml-1 flex items-center font-medium bg-gray-200/70 border border-gray-300/50 px-1 text-gray-700 rounded-md" title={`This api is used ${humanFormat(metrics[selected.id][route.hash])} times`}>
                                                                                                                                <span className=''>
                                                                                                                                    ⚡
                                                                                                                                </span>
                                                                                                                                <small className='ml-1'>{humanFormat(metrics[selected.id][route.hash])}</small>
                                                                                                                            </span> : null 
                                                                                                                        }
                                                                                                                    </div>
                                                                                                                    {false && route.featured ? <span className='w-2 h-2 ml-2 text-yellow-500'>
                                                                                                                        <IconPack name='star' />
                                                                                                                    </span>
                                                                                                                        : null
                                                                                                                    }
                                                                                                                </div>
                                                                                                            </div>
                                                                                                            {
                                                                                                                false && currentView && (currentView.route_name === route.route_name && currentView.method === route.method) ? <span className='text-green-700/90'><IconPack name="arrowRight" /></span> : null
                                                                                                            }
                                                                                                        </div>
                                                                                                    </li>))
                                                                                                }
                                                                                            </ul> : null
                                                                                    }
                                                                                </div>
                                                                            </div>
                                                                        </li>))
                                                                    }
                                                                </ul>
                                                                : null
                                                        }
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </>
                                        : null
                                }
                            </div>
                        ))
                    }
                </div>
            </div>
            {children}
        </SplitPane>
    </>)
}

const EditorCanvas = ({ selected = {}, permaCategory = {}, integrated, paneView = true, currentView = null, setView, activeView, activePath, user, config, info = {}, providers = [], providersAll = [], metrics, apiList = {}, api_endpoints = {}, children = null, onClickSetCurrentView }) => {
    const {
        SERVICE_URL,
        BASE_PATH = '/',
    } = api_endpoints;

    const myRef = useRef(null)

    const [list, setList] = useState(apiList);;
    const [categoryMap, setCategoryMap] = useState({});
    const [ activeCategory, setActiveCategory ] = useState(null);
    const [imgFallback, setImgFallback] = useState({});
    const [providersView, setProvidersView] = useState(true);
    const [sdkLibrary, setSDKLibrary] = useState('');
    useEffect(() => {
        if (Object.keys(apiList).length) {
            let localList = {};
            const intents = [];
            Object.keys(apiList).forEach(item => {
                let localIntents = [ ...apiList[item]];
                const permaCategoryLocal = permaCategory.list || [];
                if (activePath) {
                    localIntents = apiList[item].filter(i => i.route_name === activePath);
                } else if (permaCategoryLocal.length) {
                    let localList = []; 
                    permaCategoryLocal.forEach(categoryItem => {
                        const found = apiList[item].filter(i => i.tags.join('').toLowerCase() === categoryItem.toLowerCase());

                        if (found.length) {
                            localList.push(...found);
                        }
                    });
                    localIntents = [...localList];
                }
                intents.push(...localIntents);
                localList[item] = [ ...localIntents ];
            });
            setList(localList);

            if (intents.length) {
                const code = sdk(intents, selected.id, SERVICE_URL);
                setSDKLibrary(code);
            }
        }
    }, [apiList, permaCategory, activePath]);

    useEffect(() => {
        if (myRef && myRef.current) {
            myRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (selected.id) {
            setProvidersView(false);
        }
    }, [selected]);

    useEffect(() => {
        let categoryMapLocal = { ...categoryMap };
        let categoryListKeys = Object.keys(apiList);
        // console.log(categoryListKeys, permaCategory, activePath);
        if (permaCategory.all) {
            categoryListKeys.forEach(categoryItem => {
                categoryMapLocal[categoryItem.toLowerCase()] = true;
            });
            setCategoryMap({ ...categoryMapLocal });
        } else if (permaCategory.list) {
            const permaCategoryLocal = permaCategory.list;
            categoryListKeys.forEach(categoryItem => {
                categoryMapLocal[categoryItem.toLowerCase()] = false;
            });
            permaCategoryLocal.forEach(categoryItem => {
                const keys = categoryListKeys.map(i => i.toLowerCase());
                if (keys.includes(categoryItem)) {
                    categoryMapLocal[categoryItem.toLowerCase()] = true;
                }
            });
            setCategoryMap({ ...categoryMapLocal });
            setActiveCategory(permaCategory.list[0].toLowerCase());
        } else if (activePath) {
            categoryListKeys.forEach(categoryItem => {
                const findIntent = apiList[categoryItem].find(c => c.route_name === activePath);
                if (findIntent) {
                    categoryMapLocal[categoryItem.toLowerCase()] = true;
                    setActiveCategory(findIntent.tags.join('').toLowerCase());
                } else {
                    categoryMapLocal[categoryItem.toLowerCase()] = false;
                }
            });
            setCategoryMap({ ...categoryMapLocal });
        } else {
            setActiveCategory(null);
        }
    }, [apiList, permaCategory, activePath]);

    const onClickSetProvidersView = (status) => {
        setProvidersView(status);
    }
    const onSetCategory = ({ name, value }) => {
        // setCategory(name);
        let categoryMapLocal = { ...categoryMap };
        if (activeCategory === name.toLowerCase()) {
            return;
        }
        categoryMapLocal[name.toLowerCase()] = value;
        setCategoryMap({ ...categoryMapLocal });
    }

    const onError = (e, provider) => {
        const lf = { ...imgFallback };
        lf[provider] = 'lowcodeapi';
        setImgFallback({ ...lf });
    }

    return (<>
        <Tooltip id="form-tooltip" place='right-start' style={{ width: '200px', height: '200px' }} />
        <div className={`flex`}>
            <div className=" md:flex-none md:flex md:flex-col md:w-12 border-r border-gray-200 h-screen overflow-y-scroll ">
                <div className='flex-grow'>
                    <Link href={'/'}>
                        <Image src={getLogoUrl('lowcodeapi')}
                            className={`my-2 bg-white mx-auto rounded-md`}
                            alt={info.name}
                            title={info.name}
                            width={32}
                            height={32}
                            onError={(e) => onError(e, item.id)}
                        />
                    </Link>
                    <div className='flex flex-col items-center justify-center mt-4 mx-auto '>
                        {/* <button title={`Click to view all providers`} onClick={() =>onClickSetProvidersView(true)} className={`${providersView ? 'text-green-600' : 'text-gray-600'}`}>
                            <IconPack name="list" />
                        </button>
                        {
                            providersView ? 
                            <button title={`Click to view all providers`} onClick={() => onClickSetProvidersView(false)} className={`text-gray-600 mt-2`}>
                                <IconPack name="close" />
                            </button> : null
                        } */}
                    </div>
                </div>
                <div className='mt-2 mx-auto w-full'>
                    <NavRight user={user} info={info} />
                    <UsersNav user={user} config={config} info={info} col={true} onLogout={onLogout(api_endpoints.ACCOUNT_API)} />
                </div>
            </div>
            <div className='relative w-full'>
                <PaneView
                    paneView={paneView}
                    providersAll={providersAll}
                    categoryMap={categoryMap}
                    permaCategory={permaCategory}
                    activeCategory={activeCategory}
                    selected={selected}
                    info={info}
                    imgFallback={imgFallback}
                    BASE_PATH={BASE_PATH}
                    onError={onError} activeView={activeView} currentView={currentView} setView={setView}
                    list={list} metrics={metrics} onSetCategory={onSetCategory} api_endpoints={api_endpoints}
                    onClickSetCurrentView={onClickSetCurrentView}
                >
                    <div className='relative flex-grow flex flex-col h-screen overflow-hidden'>
                        <div className='mb-20'>
                            {children}
                        </div>
                        <div className='absolute bottom-0 left-0 right-0 px-4 pt-4 pb-1 bg-gray-50'>
                            <Footer info={info} />
                        </div>
                    </div>
                </PaneView>
                {/* {
                    providersView ? <div className='absolute top-0 left-0 right-0 bottom-0 p-8 bg-white z-10 overflow-hidden'>
                        <div className='flex flex-col items-center md:container md:mx-auto bg-white h-full overflow-y-scroll '>
                            <div className='flex items-center flex-wrap gap-4'>
                            {
                                providers.map(item =>(
                                    <div key={item.id} className="">
                                        {
                                        !item.disabled? <>
                                            <Link
                                                href={`${BASE_PATH}/${item.id}`}
                                                // onClick={(e) => onClickSetProvidersView(item.id)}
                                                title={item.name}
                                                className="cursor-pointer"
                                                data-tip={item.name}>
                                                <>                       
                                                    <img src={getLogoUrl(imgFallback[item.id] || item.alias ||item.id)} className={`w-10 h-10 p-1 border border-gray-200 rounded-md`} alt={item.name} title={item.name}
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
                        </div>
                    </div>: null
                } */}
            </div>
            {
                !providersView ?
                    <div className={`md:w-12 md:mx-auto border-l border-gray-200 h-screen overflow-y-scroll relative`}>
                        {
                            selected && selected.id && (selected.id !== 'lowcodeapi') && (selected.alias !== 'lowcodeapi') ? <>
                                <div>
                                    <Image src={getLogoUrl(selected.logo_path || imgFallback[selected.id] || selected.alias || selected.id)}
                                        className={`mx-auto my-2 border border-gray-200 rounded-md`}
                                        alt={selected.name || ''}
                                        title={`${selected.name}`}
                                        width={32}
                                        height={32}
                                        onError={(e) => onError(e, selected.id)}
                                    />
                                    {
                                        integrated ? <span className='absolute top-0 right-0 mr-1 mt-1'><BadgeUI className="w-2 h-2 " /></span> : null
                                    }
                                </div>
                                <div className='flex flex-col items-center justify-center mx-auto  mt-4  '>
                                    <button className={`p-1  ${activeView === 'setup' ? 'text-gray-400 text-green-700' : 'text-gray-400 text-gray-600'}`} onClick={() => setView('setup')}>
                                        <IconPack name="setup" />
                                    </button>   
                                
                                </div>
                                {
                                /*
                                    sdkLibrary ? (<div className='mx-auto mt-4 flex justify-center'>
                                        <a href={window.URL.createObjectURL(new Blob([sdkLibrary]))} target="_blank" download={`${selected.id}-lowcodeapi.js`} className="w-4 h-4" title={`${selected.name} JavaScript client library`}>
                                            <IconPack name='download' />
                                        </a>
                                    </div>) : null
                                */
                                }
                            </> : <>
                                {/* {providers.map((item) => (
                                    <Link href={`/${item.id}`} target='_blank'>
                                        <Image src={item.logo_url}
                                            className={`w-8 h-8 mx-auto my-2 border border-gray-200 rounded-md`}
                                            alt={item.name || ''}
                                            title={`${item.name}`}
                                            width={32}
                                            height={32}
                                        />
                                    </Link>
                                ))} */}
                            </>
                        }
                    </div>
                : null
            }
        </div>
    </>)
};

export default EditorCanvas;
