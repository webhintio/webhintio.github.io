const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
const path = require('path');
const express = require('express');
const yaml = require('js-yaml');
const appInsights = require('applicationinsights');
const production = process.env.NODE_ENV === 'production'; // eslint-disable-line no-process-env
const telemetry = require('@hint/utils-telemetry');
const theme = production ? 'webhint-theme-optimized' : 'webhint-theme';

const hexoDir = path.join(__dirname, '..');
const rootPath = path.join(__dirname, '..', '..');
let appInsightsClient;

if (process.env.APP_INSIGHTS_KEY) { // eslint-disable-line no-process-env
    appInsights.setup(process.env.APP_INSIGHTS_KEY) // eslint-disable-line no-process-env
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true)
        .setUseDiskRetryCaching(true)
        .start();

    appInsightsClient = appInsights.defaultClient;
} else {
    appInsightsClient = {
        trackEvent() { },
        trackException() { },
        trackMetric() { },
        trackNodeHttpRequest() { }
    };
}

const createServer = () => {
    const themeDir = path.join(hexoDir, theme);
    const layoutsDir = path.join(themeDir, 'layout');
    const app = express();

    app.disable('x-powered-by');
    app.set('views', layoutsDir);

    app.set('view engine', 'ejs');
    app.set('themeDir', themeDir);

    return app;
};

const getUtils = () => {
    const utils = require(`../${theme}/helper/utils`);
    const formatterUtils = require('@hint/formatter-html/dist/src/utils');

    return Object.assign({}, utils, formatterUtils);
};

const commonConfiguration = (app) => {
    // TODO: header security, etc. here
    const menuDataDir = path.join(hexoDir, 'content/_data/menu.yml');
    const configDataDir = path.join(rootPath, '_config.yml');
    const menuData = yaml.safeLoad(fs.readFileSync(menuDataDir, 'utf8')); // eslint-disable-line no-sync
    const config = yaml.safeLoad(fs.readFileSync(configDataDir, 'utf8')); // eslint-disable-line no-sync

    app.set('hexoDir', hexoDir);
    app.set('rootPath', rootPath);
    app.locals.site = { data: { menu: menuData } };
    app.locals.theme = config;
    app.locals.isSection = true;
    app.locals.utils = getUtils();

    app.use(bodyParser.urlencoded({ extended: false }));
};

const configureRoutes = (app) => {
    require('./routes/scanner.js')(app, appInsightsClient);
    require('./routes/search.js')(app, appInsightsClient);
    require('./routes/changelog.js')(app);
};

const trackUrlTelemetry = (req, res, next) => {
    const props = { url: req.url };

    if (req.query.source !== void 0) {
        props.source = req.query.source;
    }

    telemetry.trackEvent('online-activity-url', props);
    next();
};

const configureFallbacks = (app) => {
    app.use(trackUrlTelemetry);

    app.use('/', express.static(path.join(rootPath, 'dist')));

    if (!production) {
        app.use('/', express.static(path.join(hexoDir, theme, 'source')));
    }
};

const listen = (app) => {
    const port = process.env.PORT || 4000; // eslint-disable-line no-process-env

    app.listen(port, () => {
        console.log(`Server listening on port ${port}.`);
    });
};

telemetry.initTelemetry({
    enabled: true,
    post: (url, data) => {
        return new Promise((resolve, reject) => {
            const request = https.request(url, { method: 'POST' }, (response) => {
                resolve(response.statusCode);
            });

            request.on('error', (err) => {
                reject(err);
            });

            /*
             * Don't use request.write or request will be sent chunked.
             * Chunked requests break in node-based v2 Azure Functions,
             * which are used to run the webhint telemetry service.
             * https://github.com/Azure/azure-functions-host/issues/4926
             */
            request.end(data);
        });
    }
});

const server = createServer();

commonConfiguration(server);
configureRoutes(server);
configureFallbacks(server);
listen(server);
