import qs from 'qs';

import {
  sendRequest,
  safePromise,
} from '../../utilities';

import connectorJsonFile from './providers.json';

const connectorJson: { [key: string]: any } = { ...connectorJsonFile };

const fallbackRefreshTokenUrl: { [key: string]: Function } = {
  airtable: () => 'https://airtable.com/oauth2/v1/token',
  asana: () => 'https://app.asana.com/-/oauth_token',
  bitly: () => 'https://bitly.com/oauth/access_token',
  digitalocean: () => 'https://cloud.digitalocean.com/v1/oauth/token',
  discord: () => 'https://discord.com/api/oauth2/token',
  drip: () => 'https://www.getdrip.com/oauth/token',
  dropbox: () => 'https://www.dropbox.com/oauth2/token',
  facebook: () => 'https://graph.facebook.com/v17.0/oauth/access_token',
  gettyimages: () => 'https://authentication.gettyimages.com/oauth2/token',
  googlesheets: () => 'https://oauth2.googleapis.com/token',
  googledocs: () => 'https://oauth2.googleapis.com/token',
  gmail: () => 'https://oauth2.googleapis.com/token',
  googledrive: () => 'https://oauth2.googleapis.com/token',
  googlecalendar: () => 'https://oauth2.googleapis.com/token',
  googleforms: () => 'https://oauth2.googleapis.com/token',
  github: () => 'https://github.com/login/oauth/access_token',
  gitlab: () => 'https://gitlab.com/oauth/token',
  gumroad: () => 'https://api.gumroad.com/oauth/token',
  imgur: () => 'https://api.imgur.com/oauth2/token',
  instagram: () => 'https://graph.facebook.com/v17.0/oauth/access_token',
  producthunt: () => 'https://api.producthunt.com/v2/oauth/token',
  reddit: () => 'https://www.reddit.com/api/v1/access_token',
  shopify: ({ subdomain }: { [key: string]: string }) => `https://${subdomain}.myshopify.com/admin/oauth/access_token`,
  slack: () => 'https://slack.com/api/oauth.access',
  spotify: () => 'https://accounts.spotify.com/api/token',
  pipedrive: () => 'https://oauth.pipedrive.com/oauth/token',
  whatsapp: () => 'https://graph.facebook.com/v17.0/oauth/access_token',
  wordpress: () => 'https://public-api.wordpress.com/oauth2/token',
  zohomail: () => 'https://accounts.zoho.in/oauth/v2/token',
  zohosheet: () => 'https://accounts.zoho.in/oauth/v2/token',
};

const refreshUrl = (provider: string, obj: { [key: string]: any }) => {
  if (provider) {
    const { REFRESH_TOKEN_URL = '' } = connectorJson[provider.toUpperCase()] || {};
    let url = REFRESH_TOKEN_URL.trim()
      .replace('{auth_endpoint}', obj.auth_endpoint)
      .replace('{endpoint}', obj.endpoint)
      .replace('{subdomain}', obj.subdomain);

    if (!url && fallbackRefreshTokenUrl[provider.toLowerCase()]) {
      url = fallbackRefreshTokenUrl[provider]({ ...obj });
    }
    return url;
  }
};

interface RefreshTokenParams {
  provider: string;
  authObj: { [key: string]: any };
  credsObj: { [key: string]: any };
}

const refreshToken = async ({ provider, authObj, credsObj }: RefreshTokenParams) => {
  if (authObj.refreshToken && authObj.CLIENT_ID && authObj.CLIENT_SECRET) {
    if (provider) {
      const url = refreshUrl(provider, { ...credsObj });
      // const url = authAndRefreshTokenUrl[provider]({ ...credsObj });
      if (!url) return { provider };
      const options = {
        method: 'POST',
        data: qs.stringify({
          grant_type: 'refresh_token',
          refresh_token: authObj.refreshToken,
          client_id: authObj.CLIENT_ID,
          client_secret: authObj.CLIENT_SECRET,
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      };
      const [error, resp] = await safePromise(sendRequest(url, options));
      if (error) {
        console.log(error);
      }
      if (resp && resp.data) {
        const { access_token } = resp.data;
        const newAuthObj = { ...authObj, accessToken: access_token };
        const newCredsObj = { ...credsObj, authToken: newAuthObj };
        return { provider, credsObj: newCredsObj };
      }
    }
  }
};

export default refreshToken;
