const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const exphbs = require('express-handlebars');
const express = require('express');
const handlebars = require('handlebars');
const yaml = require('js-yaml');

const themeDir = path.join(__dirname, 'themes/documentation');
const themeHelpers = require(path.join(themeDir, 'helper/index.js'));
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
const helpers = _.merge(handlebars.helpers, themeHelpers(), scannerHelper); // combine helpers
const port = process.env.PORT || 4000; // eslint-disable-line no-process-env

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
