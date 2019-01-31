const fs = require('fs');
const path = require('path');

const mkdirp = require('mkdirp');

const setShellJSDefaultConfig = (shelljs) => {
    shelljs.config.fatal = true;
};

// Create folder if not exist before writing file.
// Reference: https://stackoverflow.com/a/16317628
const safeWriteFile = (dir, content) => {
    const folderPath = path.dirname(dir);

    mkdirp.sync(folderPath);
    fs.writeFileSync(dir, content); // eslint-disable-line no-sync
};

module.exports = {
    safeWriteFile,
    setShellJSDefaultConfig
};
