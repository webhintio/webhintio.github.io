const request = require('request-promise');
const _ = require('lodash');
const moment = require('moment');

const serviceEndpoint = 'http://localhost:3000/';
const sonarUrl = 'http://localhost:4000/';
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
    const requestResult = await request(`${serviceEndpoint}${id}`);

    if (!requestResult) {
        throw new Error(`No result found for this url. Please scan again.`);
    }

    const response = JSON.parse(requestResult);

    return response;
};

const configure = (app) => {
    const fixCategories = (rules) => {
        rules.forEach((rule) => {
            if (rule.category.toLowerCase() === 'pwas') {
                rule.category = 'pwa';
            }

            if (rule.category.toLowerCase() === 'misc') {
                rule.category = 'interoperability';
            }

            rule.category = rule.category.toLowerCase();
        });
    };

    const parseCategories = (rules) => {
        // TODO: Remove this after update to @sonarwhal/sonar > 0.9.0
        fixCategories(rules);

        let categories = [];

        rules.forEach((rule) => {
            let category = _.find(categories, (cat) => {
                return cat.name === rule.category;
            });

            if (!category) {
                category = {
                    name: rule.category,
                    results: null,
                    rules: []
                };

                categories.push(category);
            }

            category.rules.push(rule);

            if (rule.status !== ruleStatus.pass && rule.status !== ruleStatus.pending) {
                if (!category.results) {
                    category.results = [];
                }

                category.results.push(rule);
            }
        });

        categories = _.sortBy(categories, (category) => {
            return category.name;
        });

        return categories;
    };

    /** Process scanning result to add category and statistics information */
    const processRuleResults = (ruleResults) => {
        const overallStatistics = {
            errors: 0,
            warnings: 0
        };

        const categories = parseCategories(ruleResults);

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

    app.get('/scanner', (req, res) => {
        res.render('scan-form', {
            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
            title: 'Scanner'
        });
    });

    app.get('/scanner/api/:id', async (req, res) => {
        const id = req.params.id;
        let scanResult;

        try {
            scanResult = await queryResult(id);
        } catch (error) {
            return res.status(404);
        }

        const { categories } = processRuleResults(scanResult.rules);

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

        const { categories, overallStatistics } = processRuleResults(scanResult.rules);
        const renderOptions = {
            categories,
            id: scanResult.id,
            layout,
            overallStatistics,
            permalink: `${sonarUrl}scanner/${scanResult.id}`,
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
            requestResult = JSON.parse(await sendRequest(req.body.url));
        } catch (error) {
            return res.render({
                details: error.message,
                heading: 'ERROR'
            });
        }

        const id = requestResult.id;
        const { categories, overallStatistics } = processRuleResults(requestResult.rules);

        return res.render('scan-result', {
            categories,
            id: requestResult.id,
            layout,
            overallStatistics,
            permalink: `${sonarUrl}scanner/${id}`,
            url: req.body.url
        });
    });
};

module.exports = configure;
