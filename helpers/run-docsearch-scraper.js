/* global cd config echo exec exit rm */

const fs = require('fs');
const path = require('path');

const shell = require('shelljs/global'); // eslint-disable-line no-unused-vars

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// Check if the environment variables are set.

const checkEnvVar = (value) => {
    if (!process.env[value]) { // eslint-disable-line no-process-env
        console.error(`'${value}' environment variable is not set.`);
        exit(1);
    }
};

checkEnvVar('DOC_SEARCH_ID');
checkEnvVar('DOC_SEARCH_KEY');

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/* eslint-disable camelcase */
const DOC_SEARCH_CONFIGS = JSON.stringify({
    index_name: 'webhint',
    min_indexed_level: 1,
    nb_hits: 459,
    nb_hits_max: 100000,
    selectors: {
        lvl0: 'nav .guide-category',
        lvl1: '.page-intro h1',
        lvl2: '.module h2',
        lvl3: '.module h3',
        lvl4: '.module h4',
        text: '.module p'
    },
    start_urls: ['https://webhint.io/docs/'],
    stop_urls: ['https://webhint.io/docs/index.html']
});
/* eslint-enable camelcase */

/* eslint-disable no-process-env */
const DOC_SEARCH_KEY = `APPLICATION_ID=${process.env.DOC_SEARCH_ID}
API_KEY=${process.env.DOC_SEARCH_KEY}`;
/* eslint-enable no-process-env */

const TMP_DIR = require('./mktemp')();

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

config.fatal = true;

// DocSearch Scraper setup
// https://github.com/algolia/docsearch-scraper/tree/d65217cd1bd08e688b13cbc9a7bb84e0774f5f27#getting-started

// Clone repository
exec(`git clone https://github.com/algolia/docsearch-scraper.git ${TMP_DIR}`);

// Add config files.
try {
    fs.writeFileSync(path.join(`${TMP_DIR}`, '/config.json'), DOC_SEARCH_CONFIGS); // eslint-disable-line no-sync
    fs.writeFileSync(path.join(`${TMP_DIR}`, '/.env'), DOC_SEARCH_KEY); // eslint-disable-line no-sync
} catch (e) {
    exit(1);
}

cd(`${TMP_DIR}`);

// Install requirements.
exec('pip install --user -r requirements.txt');

// Run scraper.
echo('y').exec('python docsearch run config.json');

// Clean up.
rm('-rf', TMP_DIR);
