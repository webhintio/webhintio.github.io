/* global config cp exec ls mv rm */
const shell = require('shelljs/global'); // eslint-disable-line no-unused-vars

const CLONE_URL = 'https://github.com/sonarwhal/sonarwhal.git'; // eslint-disable-line no-process-env
const SOURCE_DIR = 'src/content';
const TMP_DIR = require('./mktemp')();
const PACKAGES_TMP_DIR = `${TMP_DIR}/packages`;

config.fatal = true;

// TO DO: Remove `--branch fix-748` once it's merged.
exec(`git clone --branch fix-748 ${CLONE_URL}  "${TMP_DIR}"`);

rm('-rf', `${SOURCE_DIR}/docs/contributor-guide`);
rm('-rf', `${SOURCE_DIR}/docs/user-guide`);
rm('-rf', `${SOURCE_DIR}/about`);

cp('-R', `${PACKAGES_TMP_DIR}/sonarwhal/docs/contributor-guide`, `${SOURCE_DIR}/docs/contributor-guide`);
cp('-R', `${PACKAGES_TMP_DIR}/sonarwhal/docs/user-guide`, `${SOURCE_DIR}/docs/user-guide`);
cp('-R', `${PACKAGES_TMP_DIR}/sonarwhal/docs/about`, `${SOURCE_DIR}`);
cp(`${PACKAGES_TMP_DIR}/sonarwhal/CHANGELOG.md`, `${SOURCE_DIR}/about`);

const rules = ls('-R', `${PACKAGES_TMP_DIR}/rule-*/README.md`);

rules.forEach((rulePath) => {
    const ruleName = rulePath.split('/').reverse()[1];
    const destRulePath = `${SOURCE_DIR}/docs/user-guide/rules/${ruleName}.md`;

    mv(rulePath, destRulePath);
});

rm('-rf', TMP_DIR);
