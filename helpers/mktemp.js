const os = require('os');
const path = require('path');

const mktmp = require('mktemp');

module.exports = () => {
    return mktmp.createDirSync(path.join(os.tmpdir(), '/XXXXX')); // eslint-disable-line no-sync
};
