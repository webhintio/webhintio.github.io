const shell = require('shelljs');

const constants = require('./constants');
const common = require('./common');

common.setShellJSDefaultConfig(shell);

const workingSpaceDirectories = new Set([
    constants.dirs.ABOUT,
    constants.dirs.CONTRIBUTOR_GUIDE,
    constants.dirs.USER_GUIDE,
    constants.dirs.SCAN_IMAGES,
    constants.dirs.SCAN_PARTIALS,
    constants.dirs.SCAN_SCRIPTS,
    constants.dirs.SCAN_STYLES,
    constants.dirs.SCAN_TEMPLATES
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
