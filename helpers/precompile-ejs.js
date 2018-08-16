/* eslint-disable no-sync */

const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const mkdirp = require('mkdirp');

const getPartials = (themeDir, partialList) => {
    const partialsDir = path.resolve(path.join(themeDir, 'layout', 'partials', 'scan'));
    const partialsByName = partialList.reduce((group, partialName) => {
        const partialDir = path.join(partialsDir, `${partialName}.ejs`);

        const compiledPartial = `window.ejsPartials = window.ejsPartials || {};
window.ejsPartials['${partialName}'] = ${ejs.compile(fs.readFileSync(partialDir, 'utf8'), { client: true, compileDebug: false }).toString()};`;

        group[partialName] = compiledPartial;

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
