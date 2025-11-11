import fs from 'fs';
import moment from 'moment';

const mains = fs.readdirSync(__dirname + '/src/intents/json');
fs.readdirSync(__dirname + '/src/intents/json-migration').forEach((file) => {
    console.log(file);
    const { routes, config = {} } = JSON.parse(fs.readFileSync(__dirname + '/src/intents/json-migration/' + file, 'utf-8'));
    
    const newRoutes : Array<any> = [];
    Object.keys(routes).forEach((route) => {
        const intent = routes[route].provider_alias_intent ? routes[route].provider_alias_intent.trim() : null;
        if (intent) {
            newRoutes.push({
                ...routes[route],
                provider_intent: undefined,
                "wip": undefined,
                "pinned": undefined,
                "featured": undefined,
                updated_at: moment().utc(),
            });
        }
    });

    const newJSON : { [key: string]: any } = {
        config,
        routes: newRoutes,
    }
    const json : string = JSON.stringify(newJSON, null, 2);

    fs.writeFileSync(__dirname + `/src/intents/json-migration/${file}`, json, 'utf-8');
});