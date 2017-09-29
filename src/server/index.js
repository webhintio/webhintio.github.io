const fs = require('fs');
const path = require('path');
const exphbs = require('express-handlebars');
const express = require('express');
const handlebars = require('handlebars');
const yaml = require('js-yaml');

const hexoDir = path.join(__dirname, '..', 'hexo');
const rootPath = path.join(__dirname, '..', '..');

const createServer = () => {
    const themeDir = path.join(hexoDir, 'themes/documentation');
    const layoutsDir = path.join(themeDir, 'layout');
    const partialsDir = path.join(layoutsDir, 'partials');
    const themeHelpers = require(path.join(themeDir, 'helper/index.js'))();
    const customHelpers = {
        url_for: (url) => { // eslint-disable-line camelcase
            return url;
        }
    };
    const helpers = Object.assign(handlebars.helpers, themeHelpers, customHelpers); // combine helpers
    const app = express();

    app.set('views', partialsDir);

    const hbs = exphbs.create({
        defaultLayout: 'common',
        extname: '.hbs',
        helpers,
        layoutsDir,
        partialsDir
    });

    app.engine('hbs', hbs.engine);
    app.set('view engine', 'hbs');

    return app;
};

const commonConfiguration = (app) => {
    // TODO: header security, etc. here
    const menuDataDir = path.join(hexoDir, 'source/_data/menu.yml');
    const configDataDir = path.join(rootPath, '_config.yml');
    const menuData = yaml.safeLoad(fs.readFileSync(menuDataDir, 'utf8')); // eslint-disable-line no-sync
    const config = yaml.safeLoad(fs.readFileSync(configDataDir, 'utf8')); // eslint-disable-line no-sync

    app.locals.menuData = menuData;
    app.locals.config = config;
    app.locals.isSection = true;
};

const configureRoutes = (app) => {
    require('./routes/scanner.js')(app);
    require('./routes/search.js')(app);
};

const configureFallbacks = (app) => {
    // TODO: Disable this in production
    app.use('/', express.static(path.join(process.cwd(), 'dist')));
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
