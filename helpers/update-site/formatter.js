const fs = require('fs');

const globby = require('globby');
const mkdirp = require('mkdirp');

const { copy } = require('./copy');
const { safeWriteFile } = require('./common');
const constants = require('./constants');

const globbyPattern = 'node_modules/@hint/{,configuration-all/node_modules/@hint/}formatter-html/dist/src';
const globbyOptions = {
    cwd: process.cwd(),
    onlyDirectories: true
};

const formatterPaths = new Set([
    {
        dest: constants.dirs.SCAN_TEMPLATES,
        globbyOptions,
        options: '-R',
        orig: `${globbyPattern}/views/partials`
    }, {
        dest: constants.dirs.SCAN_IMAGES,
        globbyOptions,
        options: '-R',
        orig: `${globbyPattern}/assets/images/scan`
    }, {
        dest: constants.dirs.SCAN_STYLES,
        globbyOptions,
        options: '-R',
        orig: `${globbyPattern}/assets/styles/scan`
    }, {
        dest: constants.dirs.SCAN_SCRIPTS,
        globbyOptions,
        options: '-R',
        orig: `${globbyPattern}/assets/js/scan`
    }, {
        dest: `${constants.dirs.SCAN_PARTIALS}/utils.js`,
        globbyOptions: { cwd: process.cwd() },
        options: null,
        orig: `${globbyPattern}/utils.js`
    }
]);

/**
 * Copy the formatter HTML formatter files from the hint respository
 * to their directory.
 */
const copyFormatter = () => {
    mkdirp.sync(constants.dirs.SCAN_PARTIALS);
    formatterPaths.forEach((path) => {
        const paths = globby.sync(path.orig, path.globbyOptions);

        copy(paths[0], path.dest, path.options);
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
