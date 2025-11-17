import dayjs from 'dayjs';
import getLogoUrl from '@/utils/logo-url';


function Footer({ info = {} }) {
    return (<>
        <div className='text-xs text-gray-500 flex items-center justify-between'>
            <div>
                <a href={`https://lowcodeapi.com?utm_ref=${info.BUILD_ID}&generated_by=${info.BUILD_FOR_USER}`} className='flex items-center text-xs text-gray-500 hover:text-gray-600' target='_blank'>
                    © {dayjs().format('YYYY')}
                    
                    <span className='mx-1.5'>{info.copyright}</span> 
                </a>
                {/* { 
                    info.BUILD_ID ? <p className='mt-1 flex items-center'>
                        <span className=''>Last Updated : <span className='' title={`UTC Timestamp: ${info.BUILD_DATE}`}>{moment(info.BUILD_DATE).format('YYYY-MM-DD HH:mm Z')}</span></span>
                    </p> : null
                } */}
            </div>
            <div className='mt-1 flex flex-col'>
                <div className='flex flex-col items-center justify-between'>
                    {
                        info.BUILD_FOR_USER ?
                            <div className='flex items-center'>
                            <span>Powered By</span>
                            <a href={`https://lowcodeapi.com?ref=${info.BUILD_ID}`} className='flex items-center text-gray-500 hover:text-gray-600' target="_blank">
                                <span className="mx-1.5">
                                    <img src={getLogoUrl('lowcodeapi')} className="w-4" alt={'lowcodeapi'} />
                                </span>
                                <span>LowCodeAPI</span>
                            </a>
                        </div>
                        : null 
                    }
                    { info.author_link ?
                        <p className='mt-1'>Created by <a href={`${info.author_link}`} className='text-gray-700 font-medium hover:text-gray-800 underline' target='_blank'>{info.author}</a></p> 
                        : null
                    }
                </div>
            </div>
        </div>
        {/* <div className=''>
            {
            info.show_legal ? <div className='ml-2'>
                <Link href={'/legal/privacy'} className='underline'>Privacy</Link>
                <Link href={'/legal/terms'} className='underline mx-2'>Terms</Link>
            </div>: null
            }
        </div> */}
    </>)
}

export default Footer;