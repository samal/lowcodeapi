import React from 'react';
import Link from 'next/link'
import Image from 'next/image'

import { BASE_PATH } from '../../utils/constants';
import getLogoUrl from '../../utils/logo-url';

import IconPack from '../IconPack';
import BadgeUI from '../BadgeUI';

const LogoOrIcon = ({ nav }) => {
    if  (nav.logo){
        return <Image src={getLogoUrl(nav.id)} width={16} height={16} alt={nav.id} />
    } 
        // return <img src={getLogoUrl(nav.alias || nav.id)} className="w-4" width={16} height={16} alt={nav.id} />;
    return <IconPack {...nav} name={nav.id} />
}
export default function SidebarNavs({ navs, className }) {
    return <>
        <nav className={`flex-1 px-2 space-y-1 font-semibold ${navs.length > 5 ? 'my-1': ''} ${className}`}>
            {navs.map(nav => (
                <React.Fragment key={nav.href || nav.id}>
                {nav.visible ? (
                    <>
                        {
                            !nav.disabled ? 
                                <>
                                        <Link
                                            href={`${BASE_PATH}${`/${nav.id}` }`}
                                            className={`group flex items-center justify-between px-2 py-2 text-sm leading-5 font-medium rounded-md hover:text-gray-900 focus:outline-none transition ease-in-out duration-150 ${
                                            nav.active
                                                ? 'text-gray-700 bg-gray-50 hover:bg-gray-100 focus:bg-gray-50 border border-gray-200'
                                                : 'text-gray-600 hover:bg-gray-50 focus:text-gray-900 focus:bg-gray-50 border border-white hover:border-gray-100'
                                            }`}
                                        >
                                            <>
                                                <div className='flex items-center'>
                                                    <span className='relative'>
                                                        <div className='flex drop-shadow-2xl box-shadow-md border border-gray-200 rounded-md p-1 '>
                                                            <LogoOrIcon nav={nav} />
                                                        </div>
                                                        {
                                                            nav.integration ? 
                                                            <span className='absolute top-0 right-0 -mt-1 -mr-1'>
                                                            {
                                                                (nav.integration.activated) ? 
                                                                    <span className='-mt-3'>
                                                                        <BadgeUI className="w-2 h-2" />
                                                                    </span>
                                                                : null
                                                            }
                                                            </span>
                                                        : null }
                                                    </span>
                                                    <span className="inline-block mx-3">{nav.name}</span>
                                                </div>
                                            </>
                                        </Link>
                                </> : 
                                <>
                                    <span 
                                        title={`${nav.name} will be available soon`}
                                        className={`group flex items-center px-2 py-2 text-sm leading-5 font-medium rounded-md text-gray-500 opacity-50`}
                                    >
                                        <LogoOrIcon nav={nav} />
                                        <span className="inline-block ml-2">{nav.name}</span>
                                    </span>
                            </>
                        }
                    </>
                ) : null}
                </React.Fragment>
            ))}
        </nav>
    </>;
}