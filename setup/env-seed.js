require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const lodash = require('lodash');
const moment = require('moment');

lodash.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g,
};

const ENCRYPTION_KEY = genToken(50);
const envTemplate = `
# WARNING: Encription key is used to encrypt and decrypt 3rd party credentials, do not change it once you have started the application.
# Make sure to set a strong encryption key and has a backup of it.

ENCRYPTION_KEY={{ENCRYPTION_KEY}}

####
RATE_LIMIT_WINDOW_IN_MS=60000
RATE_LIMIT_MAX_REQUEST=2

PROTOCOL={{PROTOCOL}}
REDIS_HOST=localhost
REDIS_PORT=6379
SESSION_STORE_IN_REDIS="YES"

#For MySQL
#DATABASE_URL=mysql://user:password@$localhost:3306/database

#For Postgres
#DATABASE_URL=postgresql://user:password@$localhost:5432/postgres

DATABASE_URL=

PORT={{PORT}}
APP_DOMAIN={{APP_DOMAIN}}
API_ENDPOINT={{APP_DOMAIN}}
UI_DOMAIN=localhost:3000
MOUNT_POINT=/api/v1
AUTH_MOUNT_POINT=/auth

#Keep BASE_PATH empty
BASE_PATH=

JWT_EXPIRES=7d
SESSION_EXPIRY=8640000
CACHE_ENABLED=1
CAHCE_KEY_EXPIRY_VALUE=30
JWT_SECRET={{JWT_SECRET}}
SESSION_SECRET_KEY={{SESSION_SECRET_KEY}}

# Required for Google login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Select only specific connectors to be enabled or disabled, comma separated values

# Providers list
# anthropic,assemblyai,awss3,awsses,cal,cloudflare-r2,cohere,colossyan,convertkit,copyai,customgptai,deepseek,descript,discord,dropbox,elevenlabs,freshdesk,github,gmail,googlecalendar,googledocs,googledrive,googleforms,googlesheets,gorgias,gumroad,heygen,hive,hubspot,humeai,jasper,klaviyo,leapai,letterdrop,lilt,linguix,lovo,mailchimp,mailersend,mailgun,mailjet,mistralai,name,namecheap,nanonets,notion,olamaps,openai,perplexityai,pexels,pixabay,playht,porkbun,postmark,razorpay,replicate,resembleai,resend,rossum,rows,runwayml,scenario,sendfox,sendgrid,shopify,smallestai,spaceship,squadcast,stabilityai,strava,stripe,telegram,textcortex,trello,twelvelabs,twitter,unrealspeech,unsplash,voicemaker,voicerss,weatherunion,whatsapp,wordpress,writerai,xero,yepicai,zendesk,zohoanalytics,zohoassist,zohobookings,zohobugtracker,zohocalendar,zohocampaigns,zohocommerce,zohoconnect,zohocontracts,zohocrm,zohoexpense,zohofsm,zohoinventory,zohoinvoice,zoholens,zohomail,zohomarketing,zohopeople,zohoprojects,zohosalesiq,zohosheet,zohosign,zohotables,zohowebinar,zohoworkdrive,zohoworkely,zohowriter,zohozeptomail

# To enable googlesheets and openai connectors only, uncomment the line below and comment the DISABLE_SELECTED_CONNECTORS line
# Example: 
# ENABLE_SELECTED_CONNECTORS=
DISABLE_SELECTED_CONNECTORS=whatsapp,wordpress,writerai,xero,yepicai,zendesk,zohoanalytics,zohoassist,zohobookings,zohobugtracker,zohocalendar,zohocampaigns,zohocommerce,zohoconnect,zohocontracts,zohocrm,zohoexpense,zohofsm,zohoinventory,zohoinvoice,zoholens,zohomail,zohomarketing,zohopeople,zohoprojects,zohosalesiq,zohosheet,zohosign,zohotables,zohowebinar,zohoworkdrive,zohoworkely,zohowriter,zohozeptomail

# To disable googlesheets and openai connectors, uncomment the line below and comment the ENABLE_SELECTED_CONNECTORS line
# Example:
# ENABLE_SELECTED_CONNECTORS=
# DISABLE_SELECTED_CONNECTORS=googlesheets,openai

# Generated on ${moment().format('YYYY-MM-DD HH:mm:ss')}
`;

const envTemplateUI = `
DATA_ENDPOINT=http://localhost:3456 # Only required for development instance
APP_URL=http://localhost:3456
API_URL=http://localhost:3456
NAME=LowCodeAPI

# Generated on ${moment().format('YYYY-MM-DD HH:mm:ss')}
`;
function genToken(num) {
  return crypto.randomBytes(num || 16).toString('hex');
}

const prepare = async () => {
  try {
    fs.cpSync('.env', `.env.bkp-${moment().format('YYYY-MM-DD-HH-mm-ss')}`);
    fs.rmSync('.env');
  } catch (e) {
    console.log('Server .env not found, ignoring');
  }

  try {
    fs.cpSync(path.resolve('ui', '.env'), path.resolve('ui', `.env.bkp-${moment().format('YYYY-MM-DD-HH-mm-ss')}`));
    fs.rmSync(path.resolve('ui', '.env'));
  } catch (e) {
    console.log('Nextjs .env not found, ignoring');
  }

  const {
    PROTOCOL = 'http',
    PORT = 3456,
    APP_DOMAIN,
  } = process.env;

  const templObj = {
    PROTOCOL,
    PORT,
    APP_DOMAIN: APP_DOMAIN || `localhost:${PORT}`,
    ENCRYPTION_KEY,
    JWT_SECRET: genToken(29),
    SESSION_SECRET_KEY: genToken(21),
  };
  const envFile = lodash.template(envTemplate)(templObj);
  fs.writeFileSync('.env', envFile, 'utf8');

  const envFileUI = lodash.template(envTemplateUI)({});
  fs.writeFileSync(path.resolve('ui', '.env'), envFileUI, 'utf8');
};

(async () => {
  await prepare();
  console.log('.env generated successfully');
  console.log('\n----------START: ENCRYPTION KEY-----------\n');
  console.log(ENCRYPTION_KEY);
  console.log('\n----------END: ENCRYPTION KEY-----------');
  console.log('\nMake sure to save the encryption key shown above, it will be required to decrypt any 3rd party credentials stored in the database.');
  console.log('\nCreate user by running the following command with desired EMAIL, PASSWORD, FIRST_NAME and LAST_NAME');
  console.log('`EMAIL= PASSWORD= FIRST_NAME= LAST_NAME= npm run create`');
  console.log('to create user, email and password will be used for login in the UI\n');
  process.exit();
})();
