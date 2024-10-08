const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const express = require('express');
const yaml = require('js-yaml');
const appInsights = require('applicationinsights');
const production = process.env.NODE_ENV === 'production'; // eslint-disable-line no-process-env
const theme = production ? '../themes/webhint' : 'webhint-theme';

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
    const webhintThemeDir = path.join(hexoDir, theme, '_config.yml');
    const menuData = yaml.load(fs.readFileSync(menuDataDir, 'utf8')); // eslint-disable-line no-sync
    const config = yaml.load(fs.readFileSync(configDataDir, 'utf8')); // eslint-disable-line no-sync
    const webhintTheme = yaml.load(fs.readFileSync(webhintThemeDir, 'utf8')); // eslint-disable-line no-sync

    app.set('hexoDir', hexoDir);
    app.set('rootPath', rootPath);
    app.locals.site = { data: { menu: menuData } };
    app.locals.theme = config;
    app.locals.isSection = true;
    app.locals.utils = getUtils();
    app.locals.webhintTheme = webhintTheme;

    app.use(bodyParser.urlencoded({ extended: false }));
};

const configureRoutes = (app) => {
    require('./routes/scanner.js')(app, appInsightsClient);
    require('./routes/search.js')(app, appInsightsClient);
    require('./routes/changelog.js')(app);
};

const configureFallbacks = (app) => {
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

const server = createServer();

commonConfiguration(server);
configureRoutes(server);
configureFallbacks(server);
listen(server);
