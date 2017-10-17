const _ = require('lodash');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const promisify = require('util').promisify;
const r = require('request').defaults({ headers: { authorization: `Bearer ${process.env.auth}` } }); // eslint-disable-line no-process-env
const request = promisify(r);
const yaml = require('js-yaml');
// This variable is like this WEBSITE_AUTH_ALLOWED_AUDIENCES = domain1,domain2 when in Azure
const urlAudiences = process.env.WEBSITE_AUTH_ALLOWED_AUDIENCES; // eslint-disable-line no-process-env
const sonarUrl = urlAudiences ? urlAudiences.split(',')[0] : 'http://localhost:4000/';
const serviceEndpoint = process.env.SONAR_ENDPOINT || 'http://localhost:3000/'; // eslint-disable-line no-process-env
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

const configure = (app, appInsightsClient) => {
    const reportJobEvent = (scanResult) => {
        if (scanResult.status === jobStatus.started || scanResult.status === jobStatus.pending) {
            return;
        }

        appInsightsClient.trackEvent({
            name: `scanJob${_.capitalize(scanResult.status)}`,
            properties: {
                id: scanResult.id,
                url: scanResult.url
            }
        });

        if (scanResult.status === jobStatus.finished) {
            const start = scanResult.started;
            const end = scanResult.finished;

            appInsightsClient.trackMetric({
                name: 'scan-duration',
                value: moment(end).diff(moment(start))
            });
        }
    };

    app.get('/scanner', (req, res) => {
        if (req.method === 'GET') {
            appInsightsClient.trackNodeHttpRequest({ request: req, response: res });
        }
        res.render('scan-form', {
            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
            title: 'Analyze your website using sonar online'
        });
    });

    app.get('/scanner/api/:id', async (req, res) => {
        const id = req.params.id;
        let scanResult;

        try {
            const start = Date.now();

            scanResult = await queryResult(id);
            appInsightsClient.trackMetric({ name: 'query-result-duration', value: Date.now() - start });
        } catch (error) {
            appInsightsClient.trackException({ exception: new Error('queryResultError') });

            return res.status(500);
        }

        reportJobEvent(scanResult);

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
            const start = Date.now();

            scanResult = await queryResult(id);
            appInsightsClient.trackMetric({ name: 'query-result-duration', value: Date.now() - start });
        } catch (error) {
            appInsightsClient.trackException({ exception: new Error('queryResultError') });

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
        if (req.method === 'POST') {
            appInsightsClient.trackNodeHttpRequest({ request: req, response: res });
        }

        if (!req.body || !req.body.url) {
            return res.render('error', {
                details: 'Please provide a url.',
                heading: ''
            });
        }

        let requestResult;

        try {
            const start = Date.now();
            const result = await sendRequest(req.body.url);

            appInsightsClient.trackMetric({ name: 'send-request-duration', value: Date.now() - start });
            requestResult = JSON.parse(result.body);
        } catch (error) {
            appInsightsClient.trackException({ exception: new Error('sendRequestError') });

            return res.render('scan-error');
        }

        const id = requestResult.id;
        const status = requestResult.status;
        const messagesInQueue = requestResult.messagesInQueue;
        const { categories, overallStatistics } = processRuleResults(requestResult.rules, req.body.url);

        appInsightsClient.trackEvent({
            name: 'scanJobCreated',
            properties: {
                id,
                url: req.body.url
            }
        });

        return res.render('scan-result', {
            categories,
            id: requestResult.id,
            layout,
            overallStatistics,
            permalink: `${sonarUrl}scanner/${id}`,
            showQueue: messagesInQueue || status === jobStatus.pending,
            status,
            url: req.body.url
        });
    });
};

module.exports = configure;
