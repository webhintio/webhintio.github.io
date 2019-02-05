const shell = require('shelljs');
const common = require('./common');

common.setShellJSDefaultConfig(shell);

const cloneRepo = (repository, destFolder) => {
    shell.exec(`git clone ${repository} "${destFolder}"`);
};

module.exports = { cloneRepo };
