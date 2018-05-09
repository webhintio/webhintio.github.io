/* eslint-disable no-sync */

const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');
const mkdirp = require('mkdirp');

const getPartials = (themeDir, partialList) => {
    const partialsDir = path.resolve(path.join(themeDir, 'layout', 'partials'));
    const partialsByName = partialList.reduce((group, partialName) => {
        const partialDir = path.join(partialsDir, `${partialName}.hbs`);

        group[partialName] = `(function() {
var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['${partialName}'] = template(${Handlebars.precompile(fs.readFileSync(partialDir, 'utf8'), { compat: true })});
Handlebars.partials = Handlebars.templates;
})();`;

        return group;
    }, {});

    return partialsByName;
};

const process = (themeDir, destDir, partialList) => {
    const partials = getPartials(themeDir, partialList);
    const dest = path.join(themeDir, destDir);

    mkdirp.sync(dest);

    Object.entries(partials).forEach(([key, value]) => {
        const filePath = path.join(dest, `${key}.js`);

        fs.writeFileSync(filePath, value, 'utf8');
    });
};

module.exports = process;
