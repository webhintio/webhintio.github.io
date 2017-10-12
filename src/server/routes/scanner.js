const _ = require('lodash');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const promisify = require('util').promisify;
const r = require('request');
const request = promisify(r);
const yaml = require('js-yaml');

const serviceEndpoint = 'http://localhost:3000/';
const sonarUrl = 'http://localhost:4000/';
const hexoDir = path.join(__dirname, '..', '..', 'hexo');
const thirdPartyServiceConfigPath = path.join(hexoDir, 'source/_data/third-party-service-config.yml');
const thirdPartyServiceConfig = yaml.safeLoad(fs.readFileSync(thirdPartyServiceConfigPath, 'utf8')); // eslint-disable-line no-sync
const layout = 'scan';
const jobStatus = {
    error: 'error',
    finished: 'finished',
    pending: 'pending',
    started: 'started',
    warning: 'warning'
};
const ruleStatus = {
    error: 'error',
    pass: 'pass',
    pending: 'pending',
    warning: 'warning'
};

const pad = (timeString) => {
    return timeString && timeString.length === 1 ? `0${timeString}` : timeString;
};

const calculateTimeDifference = (start, end) => {
    const duration = moment.duration(moment(end).diff(moment(start)));
    const minutes = pad(`${duration.get('minutes')}`);
    const seconds = pad(`${duration.get('seconds')}`);

    return `${minutes}:${seconds}`;
};

const sendRequest = (url) => {
    const formData = { url };
    const options = {
        formData,
        method: 'POST',
        url: `${serviceEndpoint}`
    };

    return request(options);
};

const queryResult = async (id) => {
    const result = await request(`${serviceEndpoint}${id}`);

    if (!result.body) {
        throw new Error(`No result found for this url. Please scan again.`);
    }

    const response = JSON.parse(result.body);

    return response;
};

const updateLink = (thirdPartyInfo, scanUrl) => {
    if (!thirdPartyInfo.link) {
        return thirdPartyInfo;
    }

    thirdPartyInfo.link = thirdPartyInfo.link.replace(/%URL%/, scanUrl);

    return thirdPartyInfo;
};

const parseCategories = (rules, scanUrl, includeIncompleteScan) => {
    // The `includeIncompleteScan` flag enables collecting `pending` rules.
    // So that we can show them as `scan failed` items in the front end.
    let categories = [];

    rules.forEach((rule) => {
        let category = _.find(categories, (cat) => {
            return cat.name === rule.category;
        });

        if (!category) {
            category = {
                incompleteRules: null,
                name: rule.category,
                results: null,
                rules: []
            };

            categories.push(category);
        }

        const thirdPartyInfo = thirdPartyServiceConfig[rule.name];

        if (thirdPartyInfo) {
            rule.thirdParty = updateLink(thirdPartyInfo, scanUrl);
        }

        category.rules.push(rule);

        if (rule.status !== ruleStatus.pending) {
            // Passed rules are included in the results.
            if (!category.results) {
                category.results = [];
            }

            category.results.push(rule);
        }

        if (includeIncompleteScan && rule.status === jobStatus.pending) {
            if (!category.incompleteRules) {
                category.incompleteRules = [];
            }

            category.incompleteRules.push(rule);
        }
    });

    categories = _.sortBy(categories, (category) => {
        return category.name;
    });

    return categories;
};

/** Process scanning result to add category and statistics information */
const processRuleResults = (ruleResults, scanUrl, includeIncompleteScan) => {
    const overallStatistics = {
        errors: 0,
        warnings: 0
    };

    const categories = parseCategories(ruleResults, scanUrl, includeIncompleteScan);

    // Caculate numbers of `errors` and `warnings`.
    _.forEach(categories, (category) => {
        const statistics = _.reduce(category.results || [], (count, rule) => {
            if (rule && rule.status === ruleStatus.error) {
                count.errors += rule.messages.length;
                overallStatistics.errors += rule.messages.length;
            }

            if (rule && rule.status === ruleStatus.warning) {
                count.warnings += rule.messages.length;
                overallStatistics.warnings += rule.messages.length;
            }

            return count;
        }, { errors: 0, warnings: 0 });

        category.statistics = statistics;
    });

    return { categories, overallStatistics };
};

const configure = (app) => {
    app.get('/scanner', (req, res) => {
        res.render('scan-form', {
            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
            title: 'Analyze your website using sonar online'
        });
    });

    app.get('/scanner/api/:id', async (req, res) => {
        const id = req.params.id;
        let scanResult;

        try {
            scanResult = await queryResult(id);
        } catch (error) {
            return res.status(500);
        }

        const { categories } = processRuleResults(scanResult.rules, scanResult.url);

        return res.send({
            categories,
            status: scanResult.status,
            time: calculateTimeDifference(scanResult.started, scanResult.status === jobStatus.finished ? scanResult.finished : void 0),
            version: scanResult.sonarVersion
        });
    });

    app.get('/scanner/:id', async (req, res) => {
        const id = req.params.id;
        let scanResult;

        try {
            scanResult = await queryResult(id);
        } catch (error) {
            return res.render('error', {
                details: error.message,
                heading: 'ERROR'
            });
        }

        const includeIncompleteScan = scanResult.status === jobStatus.error;
        const { categories, overallStatistics } = processRuleResults(scanResult.rules, scanResult.url, includeIncompleteScan);
        const renderOptions = {
            categories,
            id: scanResult.id,
            layout,
            overallStatistics,
            permalink: `${sonarUrl}scanner/${scanResult.id}`,
            status: scanResult.status,
            time: calculateTimeDifference(scanResult.started, scanResult.status === jobStatus.finished ? scanResult.finished : void 0),
            url: scanResult.url,
            version: scanResult.sonarVersion
        };

        if (scanResult.status === jobStatus.error || scanResult.status === jobStatus.finished) {
            renderOptions.isFinish = true;
        }

        res.render('scan-result', renderOptions);
    });

    app.post('/scanner', async (req, res) => {
        if (!req.body || !req.body.url) {
            return res.render('error', {
                details: 'Please provide a url.',
                heading: ''
            });
        }

        let requestResult;

        try {
            const result = await sendRequest(req.body.url);

            requestResult = JSON.parse(result.body);
        } catch (error) {
            return res.render('scan-error');
        }

        const id = requestResult.id;
        const status = requestResult.status;
        const { categories, overallStatistics } = processRuleResults(requestResult.rules, req.body.url);

        return res.render('scan-result', {
            categories,
            id: requestResult.id,
            layout,
            overallStatistics,
            permalink: `${sonarUrl}scanner/${id}`,
            status,
            url: req.body.url
        });
    });
};

module.exports = configure;
