import fs from 'fs';
import path from 'path';
import { loggerService } from '../utilities';

const dirPath = `${__dirname}/json`;

const { ENABLE_SELECTED_CONNECTORS = '', DISABLE_SELECTED_CONNECTORS = '' } = process.env;

const providerList : any = [];

let AVAILABLE_CONNECTORS : any = [];
let DISABLED_CONNECTORS : any = [];

const load = () => {
  const list = fs.readdirSync(dirPath);
  const json : { [key: string]: any } = {};

  list.forEach((item) => {
    const [provider_name, extension] = item.split('.');
    if (extension !== 'json') return;
    const filePath = path.resolve(__dirname, `./json/${item}`);

    try {
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (jsonData.config) {
        providerList.push({ ...jsonData.config });
        json[provider_name] = jsonData;
      }
    } catch (e : any) {
      loggerService.error('Error loading json for ',item,  e.message, 'Ignoring this file');
    }
  });

  return json;
};

const providersJson : {[ key: string]: any} = load();

let finalConnectorsList : any = [];

try {
  DISABLED_CONNECTORS = DISABLE_SELECTED_CONNECTORS.trim().split(',').map((i) => i.toString().trim().toLowerCase());
  if (DISABLED_CONNECTORS.length) {
    console.log('DISABLED_CONNECTORS', DISABLED_CONNECTORS);
    finalConnectorsList = providerList
      .filter((item : any) => !DISABLED_CONNECTORS.includes(item.id));
  }
} catch (e) {
  console.log('DISABLE_SELECTED_CONNECTORS', e);
}

if (!DISABLE_SELECTED_CONNECTORS.trim()) {
  try {
    AVAILABLE_CONNECTORS = ENABLE_SELECTED_CONNECTORS.trim().split(',').map((i) => i.toString().trim().toLowerCase());
    if (AVAILABLE_CONNECTORS.length) {
      finalConnectorsList = providerList
        .filter((item : any) => AVAILABLE_CONNECTORS.includes(item.id));
    }
  } catch (e) {
    console.log('AVAILABLE_CONNECTORS', e);
  }
}

if (!finalConnectorsList.length) {
  finalConnectorsList = providerList;
}

finalConnectorsList = finalConnectorsList.filter((item: any) => item.released);

const connectorMap : {[ key: string]: any} = {};
const connectorMapIntents : {[ key: string]: any} = {};

finalConnectorsList.forEach((provider: any) => {
  connectorMap[provider.id] = provider;
  connectorMapIntents[provider.id] = providersJson[provider.id];
});

const connectorListExport : any = [...finalConnectorsList];

export default connectorMapIntents;

export {
  connectorListExport as providerList,
  connectorMap as providerMap,
};
