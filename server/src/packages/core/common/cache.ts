interface Service {
    ref_id?: string;
    hosting_domain?: string;
    app_hosting_name?: string;
  }

  interface CacheKeys {
    configKey: string;
    hostsKey: string;
    tokenKey: string;
  }

const getCacheKeys = (service: Service): CacheKeys => {
  const serviceMainCacheKey = service.ref_id
        || service.hosting_domain || service.app_hosting_name;

  return {
    configKey: `${serviceMainCacheKey}__config`,
    hostsKey: `${serviceMainCacheKey}_hosts`,
    tokenKey: `${serviceMainCacheKey}__token_{{api_token}}`,
  };
};

export default getCacheKeys;
