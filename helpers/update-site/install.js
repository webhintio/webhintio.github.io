const shell = require('shelljs');
const common = require('./common');

common.setShellJSDefaultConfig(shell);

const install = () => {
    shell.exec(`npm install`);
};

module.exports = { install };
