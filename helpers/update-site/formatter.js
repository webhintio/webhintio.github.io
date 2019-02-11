const fs = require('fs');

const mkdirp = require('mkdirp');

const { copy } = require('./copy');
const { safeWriteFile } = require('./common');
const constants = require('./constants');

const FORMATTER_SRC = `${constants.dirs.HINT_PACKAGES}/formatter-html/src`;

const formatterPaths = new Set([
    {
        dest: constants.dirs.SCAN_TEMPLATES,
        options: '-R',
        orig: `${FORMATTER_SRC}/views/partials`
    }, {
        dest: constants.dirs.SCAN_IMAGES,
        options: '-R',
        orig: `${FORMATTER_SRC}/assets/images/scan`
    }, {
        dest: constants.dirs.SCAN_STYLES,
        options: '-R',
        orig: `${FORMATTER_SRC}/assets/styles/scan`
    }, {
        dest: constants.dirs.SCAN_SCRIPTS,
        options: '-R',
        orig: `${FORMATTER_SRC}/assets/js/scan`
    }, {
        // This file will be compiled during the building process.
        dest: `${constants.dirs.SCAN_PARTIALS}/utils.ts`,
        options: null,
        orig: `${FORMATTER_SRC}/utils.ts`
    }
]);

/**
 * Copy the formatter HTML formatter files from the hint respository
 * to their directory.
 */
const copyFormatter = () => {
    mkdirp.sync(constants.dirs.SCAN_PARTIALS);
    formatterPaths.forEach((path) => {
        copy(path.orig, path.dest, path.options);
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
