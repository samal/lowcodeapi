import dayjs from 'dayjs';
import jwt from 'jsonwebtoken';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { v2 as cloudinaryV2 } from 'cloudinary';

const awsses: Function = async (url: string, { method, body }: {
    method: string;
    body: { [key: string]: any };
}, creds: { [key: string]: any }) => {

  const { region, accessKeyId, secretAccessKey } = creds;

  const credentials = {
    accessKeyId,
    secretAccessKey,
  };

  const { protocol, pathname, host } = new URL(url);
  const httpRequest = new HttpRequest({
    method,
    protocol,
    hostname: host,
    path: pathname,
    body: JSON.stringify(body),
    headers: {
      Host: host,
      'content-type': 'application/json',
    },
  });

  const signer = new SignatureV4({
    region,
    service: 'ses',
    credentials,
    applyChecksum: true,
    sha256: Sha256,
  });
  const signedRequest = await signer.sign(httpRequest);

  const options = {
    method,
    url,
    headers: signedRequest.headers,
    data: signedRequest.body,
  };
  return options;
};

// @see -> https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html
const awss3: Function = async (url: string, { method, body }: {
    method: string;
    body: { [key: string]: any };
}, creds: { [key: string]: any }) => {
  const credentials = {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
  };
  const { region } = creds;

  const { protocol, pathname, host } = new URL(url);
  const httpRequest = new HttpRequest({
    method,
    protocol,
    hostname: host,
    path: pathname,
    body: JSON.stringify(body),
    headers: {
      Host: host,
      'content-type': 'application/json',
    },
  });

  const signer = new SignatureV4({
    region,
    service: 's3',
    credentials,
    applyChecksum: true,
    sha256: Sha256,
  });
  const signedRequest = await signer.sign(httpRequest);

  const options = {
    method,
    url,
    headers: signedRequest.headers,
    data: signedRequest.body,
  };
  return options;
};

// @see -> https://docs.scenario.com/docs#-authentication
const scenario: Function = async (url: string, { method, body, headers }: {
    method: string;
    body: { [key: string]: any };
    headers: { [key: string]: any };
}, creds: { [key: string]: any }) => {
  const { api_key, api_secret } = creds;
  const base64Token = Buffer.from(`${api_key}:${api_secret}`).toString('base64');
  const headersCustom = {
    Authorization: `Basic ${base64Token}`,
  };

  const options = {
    method,
    url,
    headers: { ...headers, ...headersCustom },
    data: body,
  };
  return options;
};

// @see -> https://cloudinary.com/documentation/upload_images#using_cloudinary_backend_sdks_to_generate_sha_authentication_signatures
const cloudinary: Function = async (url: string, { method, body, headers }: {
    method: string;
    body: { [key: string]: any };
    headers: { [key: string]: any };
}, creds: { [key: string]: any }) => {
  const timestamp = Math.round((new Date()).getTime() / 1000);
  const signature = cloudinaryV2.utils.api_sign_request({ timestamp, ...body }, creds.apiSecret);

  const options = {
    method,
    url,
    headers,
    data: { ...body, timestamp, signature },
  };
  return options;
};

const appledeveloper: Function = async (url: string, { method, body, headers }: {
    method: string;
    body: { [key: string]: any };
    headers: { [key: string]: any };
}, creds: { [key: string]: any }) => {
  const jwtHeader = {
    alg: 'ES256',
    kid: creds.key_id,
    typ: 'JWT',
  };

  const jwtPayload = {
    sub: 'user',
    iat: dayjs().unix(),
    exp: dayjs().add(10, 'm').unix(),
    aud: 'appstoreconnect-v1',
    scope: [
      // "GET /v1/apps?filter[platform]=IOS"
    ],
  };
  const signed_token = jwt.sign(jwtPayload, creds.private_key, { header: jwtHeader });
  const headersCustom = {
    Authorization: `Bearer ${signed_token}`,
  };

  const options = {
    method,
    url,
    headers: { ...headers, ...headersCustom },
    data: body,
  };
  return options;
};

const handler: { [key: string]: any } = {
  awss3,
  awsses,
  cloudinary,
  scenario,
  appledeveloper,
};
export default handler;
