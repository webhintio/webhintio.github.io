/* global config cp exec rm */

const shell = require('shelljs/global'); // eslint-disable-line no-unused-vars

const CLONE_URL = 'https://github.com/sonarwhal/sonar.git'; // eslint-disable-line no-process-env
const SOURCE_DIR = 'src/hexo/source';
const TMP_DIR = require('./mktemp')();

config.fatal = true;

exec(`git clone ${CLONE_URL}  "${TMP_DIR}"`);

rm('-rf', `${SOURCE_DIR}/docs/contributor-guide`);
rm('-rf', `${SOURCE_DIR}/docs/user-guide`);
rm('-rf', `${SOURCE_DIR}/about`);

cp('-R', `${TMP_DIR}/docs/contributor-guide`, `${SOURCE_DIR}/docs/contributor-guide`);
cp('-R', `${TMP_DIR}/docs/user-guide`, `${SOURCE_DIR}/docs/user-guide`);
cp('-R', `${TMP_DIR}/docs/about`, `${SOURCE_DIR}`);
cp(`${TMP_DIR}/CHANGELOG.md`, `${SOURCE_DIR}/about`);

rm('-rf', `${SOURCE_DIR}/about/CONTRIBUTORS.md`);
rm('-rf', TMP_DIR);
