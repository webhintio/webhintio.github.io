const request = require('request-promise');
const _ = require('lodash');
const moment = require('moment');

<<<<<<< HEAD
const scannerIntro = {
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
    title: 'Scanner'
=======
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
>>>>>>> b87d72133ffbc3b7cc01b64d6d8f2d47bff062d2
};
const serviceEndpoint = 'http://localhost:3000/';
const sonarUrl = 'http://localhost:4000/';
const jobStatus = {
    error: 'error',
    finished: 'finished',
    pending: 'pending',
    started: 'started'
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
<<<<<<< HEAD
    /** Rule categories information from config */
    const ruleCatogries = app.locals.categoriesData;

    /** Look up for the category name given a rule ID */
    const lookupCategory = (ruleId) => {
        let targetCategory;

        _.forEach(ruleCatogries, (category) => {
            targetCategory = category.rules.includes(ruleId) ? category.name : targetCategory;
        });

        return targetCategory;
=======
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
>>>>>>> b87d72133ffbc3b7cc01b64d6d8f2d47bff062d2
    };

    /** Process scanning result to add category and statistics information */
    const processRuleResults = (ruleResults) => {
        const overallStatistics = {
            errors: 0,
            warnings: 0
        };
<<<<<<< HEAD
        const parsedResults = _.cloneDeep(ruleCatogries);

        const filteredRuleResults = _.filter(ruleResults, (ruleResult) => {
            return ruleResult.status !== 'pass';
        });

        // Add category information in each rule result.
        _.forEach(filteredRuleResults, (rule) => {
            rule.category = lookupCategory(rule.name);
        });

        const resultsByCategory = _.groupBy(filteredRuleResults, 'category');

        parsedResults.forEach((category) => {
            // Append rule results to categories.
            category.results = resultsByCategory[category.name];
        });

        // Caculate numbers of `errors` and `warnings`.
        _.forEach(parsedResults, (category) => {
=======

        const categories = parseCategories(ruleResults);

        // Caculate numbers of `errors` and `warnings`.
        _.forEach(categories, (category) => {
>>>>>>> b87d72133ffbc3b7cc01b64d6d8f2d47bff062d2
            const statistics = _.reduce(category.results || [], (count, rule) => {
                if (rule && rule.status === ruleStatus.error) {
                    count.errors += rule.messages.length;
                    overallStatistics.errors += rule.messages.length;
                }

<<<<<<< HEAD
<<<<<<< HEAD
                if (rule && rule.status === jobStatus.warnings) {
                    count.warnings += rule.messages.length;
                    overallStatistics.warnigs += rule.messages.length;
=======
                if (rule && rule.status === jobStatus.warning) {
=======
                if (rule && rule.status === ruleStatus.warning) {
>>>>>>> 350f97dcd9242ff021036e7d2571f0db6a92c63e
                    count.warnings += rule.messages.length;
                    overallStatistics.warnings += rule.messages.length;
>>>>>>> b87d72133ffbc3b7cc01b64d6d8f2d47bff062d2
                }

                return count;
            }, { errors: 0, warnings: 0 });

            category.statistics = statistics;
        });

<<<<<<< HEAD
        return { overallStatistics, parsedResults };
=======
        return { categories, overallStatistics };
>>>>>>> b87d72133ffbc3b7cc01b64d6d8f2d47bff062d2
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

<<<<<<< HEAD
    app.get('/scanner/api/:id', async (req, res) => {
        const id = req.params.id;
        let scanResult;

        try {
            scanResult = await queryResult(id);
        } catch (error) {
            return res.status(404);
        }

        const { parsedResults } = processRuleResults(scanResult.rules);

        return res.send({
            result: parsedResults,
            status: scanResult.status,
            time: calculateTimeDifference(scanResult.started, scanResult.finished),
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

        const { parsedResults, overallStatistics } = processRuleResults(scanResult.rules);

        res.render('scan-result', {
            categories: parsedResults,
            overallStatistics,
            permalink: `${sonarUrl}scanner/${scanResult.id}`,
            scanResult: true,
            time: calculateTimeDifference(scanResult.started, scanResult.finished),
            url: scanResult.url,
            version: scanResult.sonarVersion
        });
    });

=======
>>>>>>> b87d72133ffbc3b7cc01b64d6d8f2d47bff062d2
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
<<<<<<< HEAD
        const emptyResult = _.cloneDeep(ruleCatogries);

        _.forEach(emptyResult, (category) => {
            category.statistics = { errors: 0, warnings: 0 };
        });

        return res.render('scan-result', {
            categories: emptyResult,
            id,
            permalink: `${sonarUrl}scanner/${id}`,
            scan: true,
=======
        const { categories, overallStatistics } = processRuleResults(requestResult.rules);

        return res.render('scan-result', {
            categories,
            id: requestResult.id,
            layout,
            overallStatistics,
            permalink: `${sonarUrl}scanner/${id}`,
>>>>>>> b87d72133ffbc3b7cc01b64d6d8f2d47bff062d2
            url: req.body.url
        });
    });
};

module.exports = configure;
