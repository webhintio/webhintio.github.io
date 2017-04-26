const express = require('express');
const handlebars = require('handlebars');
const exphbs = require('express-handlebars');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');
const themeDir = path.join(__dirname, 'themes/documentation');
const themeHelpers = require(path.join(themeDir, 'helper/index.js'));
const layoutsDir = path.join(themeDir, 'layout');
const partialsDir = path.join(layoutsDir, 'partials');
const menuDataDir = 'source/_data/menu.yml';
const configDataDir = '_config.yml';
const app = express();

const menuData = yaml.safeLoad(fs.readFileSync(menuDataDir, 'utf8')); // read menu data from menu.yml
const configData = yaml.safeLoad(fs.readFileSync(configDataDir, 'utf8')); // read config date from _config.yml
const scannerHelper = {
	url_for: (path) => {
		return path;
	}
};
const helpers = _.merge(handlebars.helpers, themeHelpers(), scannerHelper); // combine helpers

app.set('views', partialsDir);

const hbs = exphbs.create({
	defaultLayout: 'index',
	extname: '.hbs',
	helpers: themeHelpers,
	layoutsDir,
	partialsDir
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

app.get('/', (req, res) => {
	res.render('scan-form', {
		isScanner: true,
		menuData
	});
});

app.post('/scanner', (req, res) => {
	res.render('scan-result', {
		isScanner: true,
		menuData
	})
});

app.use('/', express.static(path.join(__dirname, '/public')));
app.listen(4000, () => {
	console.log('Server is running at local:4000.');
});