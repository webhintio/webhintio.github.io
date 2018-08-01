const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const exphbs = require('express-handlebars');
const consolidate = require('consolidate');
const express = require('express');
const handlebars = require('handlebars');
const yaml = require('js-yaml');
const appInsights = require('applicationinsights');
const production = process.env.NODE_ENV === 'production'; // eslint-disable-line no-process-env
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
    const partialsDir = path.join(layoutsDir, 'partials');

    /* Helpers path */
    const helpersPath = path.join(themeDir, 'helper/index.js');

    /* Required Helpers */
    const miscHelpers = require(helpersPath)();

    const helpers = Object.assign(handlebars.helpers, miscHelpers); // Combine helpers
    const app = express();

    app.disable('x-powered-by');
    app.set('views', partialsDir);

    const hbs = exphbs.create({
        defaultLayout: 'common',
        extname: '.hbs',
        helpers,
        layoutsDir,
        partialsDir
    });

    app.engine('hbs', hbs.engine);
    app.engine('ejs', consolidate.ejs);
    app.set('view engine', 'hbs');
    app.set('themeDir', themeDir);

    return app;
};

const commonConfiguration = (app) => {
    // TODO: header security, etc. here
    const menuDataDir = path.join(hexoDir, 'content/_data/menu.yml');
    const configDataDir = path.join(rootPath, '_config.yml');
    const menuData = yaml.safeLoad(fs.readFileSync(menuDataDir, 'utf8')); // eslint-disable-line no-sync
    const config = yaml.safeLoad(fs.readFileSync(configDataDir, 'utf8')); // eslint-disable-line no-sync

    app.set('hexoDir', hexoDir);
    app.set('rootPath', rootPath);
    app.locals.menuData = menuData;
    app.locals.theme = config;
    app.locals.isSection = true;

    app.use(bodyParser.urlencoded({ extended: false }));
};

const configureRoutes = (app) => {
    require('./routes/scanner.js')(app, appInsightsClient);
    require('./routes/search.js')(app, appInsightsClient);
};

const configureFallbacks = (app) => {
    if (production) {
        app.use('/', express.static(path.join(rootPath, 'dist')));
    } else {
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
