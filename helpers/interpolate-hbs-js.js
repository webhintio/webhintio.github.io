/* eslint-disable no-sync */

const path = require('path');
const fs = require('fs');
const globby = require('globby');

const getPartials = (themeDir) => {
    const partialsDir = path.resolve(path.join(themeDir, 'layout', 'partials'));
    const partials = globby.sync(`${partialsDir}/**/*.hbs`);
    const partialsByName = partials.reduce((group, partialDir) => {
        const name = path.basename(partialDir, '.hbs');

        group[name] = fs.readFileSync(partialDir, 'utf8');

        return group;
    }, {});

    return partialsByName;
}

const getJS = (themeDir) => {
    const jsDir = path.resolve(path.join(themeDir, 'source'));
    const jsFiles = globby.sync(`${jsDir}/**/*.js`);

    return jsFiles;
};

const escapePartial = (partial) => {
    return partial
        .trim()
        .replace(/(\r?\n)/g, '\\$1')
        .replace(/({{.*?}})/g, '\\$1')
        .replace(/(')/g, '\\$1')
        .replace(/(")/g, '\\$1');
};

const process = (themeDir) => {
    const partials = getPartials(themeDir);
    const jsFiles = getJS(themeDir);

    jsFiles.forEach((js) => {
        const content = fs.readFileSync(js, 'utf8');
        const partialRegExp = /{{>(.+?)}}/g;
        let interpolated = content;
        let results;

        while ((results = partialRegExp.exec(content)) !== null) {
            interpolated = interpolated.replace(results[0], escapePartial(partials[results[1]]));
        }

        if (interpolated === content) {
            return;
        }

        fs.writeFileSync(js, interpolated, 'utf8');
    });
};

module.exports = process;
