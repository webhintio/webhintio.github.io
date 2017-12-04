/* globals hexo */
const fs = require('fs');
const path = require('path');
const SWPrecache = require('sw-precache');

const config = hexo.config;
const publicDir = config.public_dir;
const offlineConfig = config.offline;

const SWPrecacheConfig = offlineConfig.SWPrecacheConfig;
const workerName = offlineConfig.workerName;
const registerWorkerScriptPath = offlineConfig.registerWorkerPath;

const createServiceWorkerScript = () => {
    return SWPrecache.write(path.join(publicDir, workerName), SWPrecacheConfig);
};

const copyRegisterSWScript = () => {
    const registerWorkerTemplatePath = path.join(__dirname, '..', 'templates/swRegisterTemplate.js');
    const registerWorkerScript = fs.readFileSync(registerWorkerTemplatePath, 'utf-8') // eslint-disable-line no-sync
        .replace('__workerName__', `/${workerName}`);

    return fs.writeFileSync(path.join(publicDir, registerWorkerScriptPath), registerWorkerScript); // eslint-disable-line no-sync
};

const addServiceWorker = () => {
    createServiceWorkerScript();
    copyRegisterSWScript();
};

hexo.extend.filter.register('before_exit', addServiceWorker);
