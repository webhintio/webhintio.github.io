const shell = require('shelljs');

const constans = require('./constants');
const common = require('./common');

common.setShellJSDefaultConfig(shell);

const workingSpaceDirectories = new Set([
    constans.dirs.ABOUT,
    constans.dirs.CONTRIBUTOR_GUIDE,
    constans.dirs.USER_GUIDE,
    constans.dirs.SCAN_IMAGES,
    constans.dirs.SCAN_PARTIALS,
    constans.dirs.SCAN_SCRIPTS,
    constans.dirs.SCAN_STYLES,
    constans.dirs.SCAN_TEMPLATES
]);

/**
 * Remove a file or directory.
 * @param {string} path - Path to remove
 * @param {string} options - Options to remove
 */
const remove = (path, options) => {
    if (options) {
        shell.rm(options, path);

        return;
    }

    shell.rm(path);
};

/**
 * Clean the working space.
 */
const cleanWorkingSpace = () => {
    workingSpaceDirectories.forEach((directory) => {
        shell.rm('-rf', directory);
    });
};

module.exports = {
    cleanWorkingSpace,
    remove
};
