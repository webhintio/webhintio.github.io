const shell = require('shelljs');

const { setShellJSDefaultConfig } = require('./common');

setShellJSDefaultConfig(shell);

/**
 * Copy the origin directory or file in the destination path.
 * @param {string} orig - Origin directory or file.
 * @param {string} dest - Destinatino path.
 * @param {string} options - Options.
 */
const copy = (orig, dest, options) => {
    if (options) {
        shell.cp(options, orig, dest);

        return;
    }

    shell.cp(orig, dest);
};

module.exports = { copy };
