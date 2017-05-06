const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const exphbs = require('express-handlebars');
const express = require('express');
const handlebars = require('handlebars');
const yaml = require('js-yaml');

const themeDir = path.join(__dirname, 'themes/documentation');
const themeHelpers = require(path.join(themeDir, 'helper/index.js'))();
const layoutsDir = path.join(themeDir, 'layout');
const partialsDir = path.join(layoutsDir, 'partials');
const menuDataDir = 'source/_data/menu.yml';
const app = express();

const menuData = yaml.safeLoad(fs.readFileSync(menuDataDir, 'utf8')); // eslint-disable-line no-sync
const scannerHelper = {
    url_for: (url) => { // eslint-disable-line camelcase
        return url;
    }
};
const helpers = _.merge(handlebars.helpers, themeHelpers, scannerHelper); // combine helpers
const port = process.env.PORT || 4000; // eslint-disable-line no-process-env
const scannerIntro = {
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
    title: 'Scanner'
};

app.set('views', partialsDir);

const hbs = exphbs.create({
    defaultLayout: 'index',
    extname: '.hbs',
    helpers,
    layoutsDir,
    partialsDir
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

app.get('/scanner', (req, res) => {
    res.render('scan', {
        intro: scannerIntro,
        isScanner: true,
        menuData
    });
});

app.post('/scanner', (req, res) => {
    res.render('scan-result', {
        isScanner: true,
        menuData
    });
});

app.use('/', express.static(path.join(__dirname, '/public')));
app.listen(port, () => {
    console.log(`Server listening on port ${port}.`);
});
