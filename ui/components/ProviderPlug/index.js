import getLogoUrl from '@/utils/logo-url';

export default function ProviderPlug({ brand= '', provider, name, display, children, status }) {
    return (<>
        <span className='flex items-center'>
            <img src={getLogoUrl(brand.toLowerCase())} className=' w-4 h-4' alt={brand} title={brand} />
        </span>
        {
            display? <span className='ml-1'>{display}</span>: null
        }
        {
            children? <span className='ml-1'>{children}</span>: null
        }
    </>)
}