import nanoid from 'nanoid';
import crypto from 'crypto';

function nano(length: number = 8): string {
  const id = nanoid.nanoid(length).replace(/[~]/g, 'z').replace(/[_]/g, 'y');
  return id;
}

function genToken(num?: number): string {
  return crypto.randomBytes(num || 16).toString('hex');
}

/*
r - regular user
s - surrogate user (belongs to an organization with not login details, email belongs to the org)
b - business user (business account who will have more privillges)

*/
function generateApiToken(type = 'r', prefix = '', suffix = ''): string {
  let token = type + genToken();
  if (prefix) {
    token = `${prefix}_${token}`;
  }
  if (suffix) {
    token = `${token}_${suffix}`;
  }
  return token;
}

export default {
  nano,
  token: genToken,
  generateApiToken,
};
