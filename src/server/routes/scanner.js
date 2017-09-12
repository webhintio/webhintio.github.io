const request = require('request-promise');
const _ = require('lodash');
const moment = require('moment');

const scannerIntro = {
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
    title: 'Scanner'
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
    /** Rule categories information from config */
    const ruleCatogries = app.locals.categoriesData;

    /** Look up for the category name given a rule ID */
    const lookupCategory = (ruleId) => {
        let targetCategory;

        _.forEach(ruleCatogries, (category) => {
            targetCategory = category.rules.includes(ruleId) ? category.name : targetCategory;
        });

        return targetCategory;
    };

    /** Process scanning result to add category and statistics information */
    const processRuleResults = (ruleResults) => {
        const overallStatistics = {
            errors: 0,
            warnings: 0
        };
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
            const statistics = _.reduce(category.results || [], (count, rule) => {
                if (rule && rule.status === jobStatus.error) {
                    count.errors += rule.messages.length;
                    overallStatistics.errors += rule.messages.length;
                }

                if (rule && rule.status === jobStatus.warnings) {
                    count.warnings += rule.messages.length;
                    overallStatistics.warnigs += rule.messages.length;
                }

                return count;
            }, { errors: 0, warnings: 0 });

            category.statistics = statistics;
        });

        return { overallStatistics, parsedResults };
    };

    app.get('/scanner', (req, res) => {
        res.render('scan', { intro: scannerIntro,
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
            return res.status(404);
        }

        const { parsedResults } = processRuleResults(scanResult.rules);

        return res.send({
            result: parsedResults,
            status: scanResult.status,
            time: calculateTimeDifference(scanResult.started, scanResult.finished)
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
            url: scanResult.url
        });
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
            permalink: `https://sonarwhal.com/scanner/${scanResult.id}`,
            scanResult: true,
            time: calculateTimeDifference(scanResult.started, scanResult.finished),
            url: scanResult.url
        });
    });
};

module.exports = configure;
