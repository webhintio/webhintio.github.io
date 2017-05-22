const shell = require('shelljs');

const SOURCE_DIR = 'hexo/source';
const TMP_DIR = 'tmp/sonar';
const CLONE_URL = process.env.TRAVIS ? 'git@github.com-sonar:MicrosoftEdge/Sonar.git' : 'https://github.com/MicrosoftEdge/Sonar.git'; // eslint-disable-line no-process-env

if (shell.exec(`git clone ${CLONE_URL}  "${TMP_DIR}"`).code === 0) {
    shell.rm('-rf', `${SOURCE_DIR}/docs`);
    shell.cp('-R', `${TMP_DIR}/docs`, `${SOURCE_DIR}/docs`);
    shell.mkdir('-p', `${SOURCE_DIR}/changelog`);
    shell.cp(`${TMP_DIR}/CHANGELOG.md`, `${SOURCE_DIR}/changelog/index.md`);
}

shell.rm('-rf', TMP_DIR);
