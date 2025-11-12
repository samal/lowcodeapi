import fs from 'fs';
import moment from 'moment';

fs.readdirSync(__dirname + '/src/intents/json').forEach((file) => {

    if (file !== 'googlesheets.json') return;
    const { routes, config = {} } = JSON.parse(fs.readFileSync(__dirname + '/src/intents/json/' + file, 'utf-8'));
    
    const newRoutes : Array<any> = [];

    if (Array.isArray(routes)) return;

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

    fs.writeFileSync(__dirname + `/src/intents/json/${file}`, json, 'utf-8');
});