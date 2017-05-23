/* global config cp exec mkdir rm */

const os = require('os');
const path = require('path');

const mktemp = require('mktemp');
const shell = require('shelljs/global'); // eslint-disable-line no-unused-vars

const CLONE_URL = process.env.TRAVIS ? 'git@github.com-sonar:MicrosoftEdge/Sonar.git' : 'https://github.com/MicrosoftEdge/Sonar.git'; // eslint-disable-line no-process-env
const SOURCE_DIR = 'hexo/source';
const TMP_DIR = mktemp.createDirSync(path.join(os.tmpdir(), '/XXXXX')); // eslint-disable-line no-sync

config.fatal = true;

exec(`git clone ${CLONE_URL}  "${TMP_DIR}"`);
rm('-rf', `${SOURCE_DIR}/docs`);
cp('-R', `${TMP_DIR}/docs`, `${SOURCE_DIR}/docs`);
mkdir('-p', `${SOURCE_DIR}/changelog`);
cp(`${TMP_DIR}/CHANGELOG.md`, `${SOURCE_DIR}/changelog/index.md`);

rm('-rf', TMP_DIR);
