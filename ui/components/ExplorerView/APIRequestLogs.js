import Image from 'next/image';
import dayjs from 'dayjs';

import getLogoUrl from '../../utils/logo-url';
import StatusCodeColor from '../StatusCodeColor';

const GET_METHOD = ['GET' ];

export default function APIRequestLogs({ requestLogs, api }) {
    return (<>
        {
            requestLogs.length ? <>
                <div className='grid grid-cols-1 gap-4 text-xs min-h-[400px] p-4 bg-gray-100 border-t border-gray-300 '>
                    <div className='border-r border-gray-200 overflow-scroll'>
                        <div className="text-xs">
                            <span className={`p-1 pl-0 font-semibold`}>Request Logs { requestLogs.length? <span className='font-normal text-gray-500'>(Showing latest {requestLogs.length} requests)</span> : null }</span>
                        </div>
                        {
                            requestLogs.length ?
                            <>
                                <div className="mt-2 grid grid-cols-10 gap-1 pl-0 pb-0 p-1 font-semibold">
                                {
                                    requestLogs[0].via_provider ? <div className=''>Provider</div>: null
                                }
                                <div className=''>Status</div>
                                <div className=''>Query</div>
                                {
                                    api && !GET_METHOD.includes(api.method.toUpperCase()) ? <div className=''>Body</div> : null
                                }
                                <div className=''>Req</div>
                                <div className=''>Res</div>
                                <div className=''>Res</div>
                                <div className='col-span-3'>Date</div>
                                {/* <div className='col-span-1'>Latency</div> */}
                                </div>
                                <div className="grid grid-cols-10 pt-0 pb-2 border-b border-gray-200 text-xs font-thin">
                                <small className=''></small>
                                <small className=''>Params</small>
                                {
                                    !GET_METHOD.includes(api.method.toUpperCase()) ? <small className=''>Payload</small> : null
                                }
                                <small className=''>Headers</small>
                                <small className=''>Data</small>
                                <small className=''>Headers</small>
                                <small className='col-span-3'>Requested</small>
                                {/* <small className='col-span-1'>In secs</small> */}
                                </div>
                                <div className="h-[400px] w-full overflow-scroll">
                                {
                                    requestLogs.map((item)=> (<div key={`${item.started_at}-${item.completed_at}`} className='grid grid-cols-10 gap-1 pl-0 p-1 border-b border-gray-200 '>
                                    {
                                        item.via_provider ? <div className=''>
                                            <Image 
                                                src={getLogoUrl(item.via_provider)}
                                                className={``} 
                                                alt={item.via_provider} 
                                                width={18}
                                                height={18}
                                                onError={(e) => {}}
                                            /> 
                                        </div> : null
                                    }
                                    <div className=''>
                                        <StatusCodeColor code={item.status_code} />
                                    </div>
                                    <div className='col-span-1'>{`{...}`}</div>
                                    {
                                        !GET_METHOD.includes(item.method.toUpperCase()) ? <div className='col-span-1'>{`{...}`}</div> : null
                                    }
                                    <div className='col-span-1'>{`{...}`}</div>
                                    <div className='col-span-1'>{`{...}`}</div>
                                    <div className='col-span-1'>{`{...}`}</div>
                                    <div className='col-span-3'>{dayjs(item.started_at).format('YYYY-MM-DD HH:mm:ss')}</div>
                                    {/* <div className='col-span-1'>{moment(item.completed_at).diff(item.started_at, 'seconds')}</div> */}
                                    </div>))
                                }
                                </div>
                            </> : <div className=''>
        
                            </div>
                        }
                    </div>
                </div>
            </> : null
        }
    </>)
}