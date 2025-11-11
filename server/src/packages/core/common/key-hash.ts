import jwt from 'jsonwebtoken';
import config from '../../../config';

const { JWT_SECRET, JWT_EXPIRES } = config;
const EXPIRES = JWT_EXPIRES;

interface Payload {
  [key: string]: any;
}

interface Token {
  token: string;
  expiresIn: any;
}

function generateJwtToken(payload: any): Token {
  const expiresIn = EXPIRES;

  const tokenObj = {
    ...payload,
  };

  const jwtToken = jwt.sign(tokenObj, JWT_SECRET!, {
    expiresIn: EXPIRES,
    algorithm: 'HS256',
  });
  const token = `${jwtToken}`;

  return {
    token,
    expiresIn,
  };
}

function verify(token_key: string): Promise<Payload> {
  return new Promise((resolve, reject) => {
    if (!JWT_SECRET || typeof JWT_SECRET !== 'string') {
      return reject({
        expired: 1,
        message: 'JWT_SECRET Missing in config.',
      });
    }

    const token = token_key.split('"').join('');
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        // loggerService.error(err);
        return reject({
          expired: 1,
          message: 'Token expired.',
        });
      }
      resolve(user as Payload);
    });
  });
}

export { generateJwtToken, verify };
