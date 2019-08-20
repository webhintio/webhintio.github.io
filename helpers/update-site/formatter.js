const fs = require('fs');
const path = require('path');

const mkdirp = require('mkdirp');

const { copy } = require('./copy');
const { safeWriteFile } = require('./common');
const constants = require('./constants');

const basePath = path.resolve(process.cwd(), 'node_modules/@hint/formatter-html/dist/src');

const formatterPaths = new Set([
    {
        dest: constants.dirs.SCAN_TEMPLATES,
        options: '-R',
        orig: path.resolve(basePath, 'views/partials')
    }, {
        dest: constants.dirs.SCAN_IMAGES,
        options: '-R',
        orig: path.resolve(basePath, 'assets/images/scan')
    }, {
        dest: constants.dirs.SCAN_STYLES,
        options: '-R',
        orig: path.resolve(basePath, 'assets/styles/scan')
    }, {
        dest: constants.dirs.SCAN_SCRIPTS,
        options: '-R',
        orig: path.resolve(basePath, 'assets/js/scan')
    }, {
        dest: `${constants.dirs.SCAN_PARTIALS}/utils.js`,
        options: null,
        orig: path.resolve(basePath, 'utils.js')
    }
]);

/**
 * Copy the formatter HTML formatter files from the hint respository
 * to their directory.
 */
const copyFormatter = () => {
    mkdirp.sync(constants.dirs.SCAN_PARTIALS);
    formatterPaths.forEach((formatterPath) => {
        copy(formatterPath.orig, formatterPath.dest, formatterPath.options);
    });

    /*
     * We need to pre-process the styles from the HTML Formatter
     * just in case the formatter has the image urls relative. The
     * website needs absolute image urls.
     *
     * background-image: url('./images/scan/sub-section.svg') => background-image: url('/images/scan/sub-section.svg').
     */
    const cssPath = `${constants.dirs.SCAN_STYLES}/scan-results.css`;
    const cssContent = fs.readFileSync(cssPath, 'utf-8'); // eslint-disable-line no-sync
    const newCSSContent = cssContent.replace(/url\("([^"]*)"\)/gi, (matchString, matchGroup) => {
        const newContent = matchGroup.substr(matchGroup.indexOf('/images'));

        return matchString.replace(matchGroup, newContent);
    });

    safeWriteFile(cssPath, newCSSContent);
};

module.exports = { copyFormatter };
