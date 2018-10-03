const _ = require('lodash');
const moment = require('moment');
const promisify = require('util').promisify;
const r = require('request').defaults({ headers: { authorization: `Bearer ${process.env.auth}` } }); // eslint-disable-line no-process-env
const request = promisify(r);
const urlAudiences = process.env.WEBSITE_DOMAIN; // eslint-disable-line no-process-env
const webhintUrl = urlAudiences ? `${urlAudiences.split(',')[0]}/` : 'http://localhost:4000/';
const serviceEndpoint = process.env.SONAR_ENDPOINT || 'http://localhost:3000/'; // eslint-disable-line no-process-env
const underConstruction = process.env.UNDER_CONSTRUCTION; // eslint-disable-line no-process-env
const production = process.env.NODE_ENV === 'production'; // eslint-disable-line no-process-env
const theme = production ? 'webhint-theme-optimized' : 'webhint-theme';

const HTMLFormatter = require(`../../${theme}/formatter`).default;
const formatter = new HTMLFormatter();

const jobStatus = {
    error: 'error',
    finished: 'finished',
    pending: 'pending',
    started: 'started',
    warning: 'warning'
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

const queryResult = async (id, tries) => {
    let response;
    const counts = tries || 0;
    const result = await request(`${serviceEndpoint}${id}`);

    if (!result.body) {
        throw new Error(`No result found for this url. Please scan again.`);
    }

    try {
        response = JSON.parse(result.body);
    } catch (error) {
        if (counts === 3) {
            // Sometimes error `Unexpected Token at <` occurs
            // And it disappears after querying more times.
            throw error;
        }

        return queryResult(id, counts + 1);
    }

    return response;
};

/** Process scanning result to add category and statistics information */
const processHintResults = async (scanResult) => {
    const hints = (scanResult.hints && scanResult.hints.length > 0) ? scanResult.hints : scanResult.rules;
    const messages = hints.reduce((total, hint) => {
        return total.concat(hint.messages.map((message) => {
            // Make it compatible with the old version.
            if (!message.hintId) {
                message.hintId = message.ruleId;
            }

            message.category = hint.category;

            return message;
        }));
    }, []);

    const scanEnd = (scanResult.status === jobStatus.finished || scanResult.status === jobStatus.error) ? scanResult.finished : void 0;
    const scanTime = moment.duration(moment(scanEnd).diff(moment(scanResult.started)));

    const result = await formatter.format(messages, scanResult.url, {
        isScanner: true,
        noGenerateFiles: true,
        scanTime,
        status: scanResult.status,
        version: scanResult.webhintVersion || scanResult.sonarVersion
    });

    result.removeCategory('other');
    result.removeCategory('development');

    /*
     * Formatter always returns hint status equal to `finished`
     * We need to assign the real status
     */
    hints.forEach((hint) => {
        const resultCategory = result.getCategoryByName(hint.category);
        let resultHint = resultCategory.getHintByName(hint.name);

        if (!resultHint) {
            resultHint = resultCategory.addHint(hint.name, hint.status);
        }
    });

    result.id = scanResult.id;
    result.permalink = `${webhintUrl}scanner/${scanResult.id}`;

    const totalHints = result.categories.reduce((total, category) => {
        total.finished += category.passed.length + category.hints.filter((hint) => {
            return hint.status !== 'pending';
        }).length;
        total.total += category.passed.length + category.hints.length;

        return total;
    }, { finished: 0, total: 0 });

    result.percentage = totalHints.finished / totalHints.total * 100;

    return result;
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

    let scanner;

    if (underConstruction && underConstruction === 'true') {
        scanner = (req, res) => {
            res.set('Cache-Control', 'no-cache');

            return res.render('common', {
                page: {
                    description: `Analyze any public website using webhint's online tool`,
                    title: `webhint's online scanner`
                },
                partial: 'under-construction',
                result: null
            });
        };
    } else {
        scanner = (req, res) => {
            res.set('Cache-Control', 'no-cache');

            if (req.method === 'GET') {
                appInsightsClient.trackNodeHttpRequest({ request: req, response: res });
            }
            res.render('scan', {
                page: {
                    description: `Analyze any public website using webhint's online tool`,
                    title: `webhint's online scanner`
                },
                result: null
            });
        };
    }

    app.get('/scanner', scanner);

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

        const result = await processHintResults(scanResult);

        return res.send({ result });
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
                heading: 'ERROR',
                page: {
                    description: `Analyze any public website using webhint's online tool`,
                    title: `webhint's online scanner`
                }
            });
        }

        try {
            const result = await processHintResults(scanResult);
            const renderOptions = {
                page: {
                    description: `webhint has identified ${result.errors} errors and ${result.warnings} warnings in ${result.url}`,
                    title: `webhint report for ${result.url}`
                },
                result,
                showQueue: false
            };

            res.set('Cache-Control', 'max-age=180');
            res.render('scan', renderOptions);
        } catch (err) {
            res.send(err);
        }
    });

    const getJobConfig = async (req, res) => {
        const job = await queryResult(req.params.jobId);

        if (!job) {
            return res.status(404).send('Job Not Found');
        }

        return res.send(job.config);
    };

    app.get('/scanner/config/:jobId', getJobConfig);

    let scannerPost;

    if (underConstruction && underConstruction === 'true') {
        scannerPost = (req, res) => {
            return res.render('common', {
                page: {
                    description: `Analyze any public website using webhint's online tool`,
                    title: `webhint's online scanner`
                },
                partial: 'under-construction',
                result: null
            });
        };
    } else {
        scannerPost = async (req, res) => {
            if (req.method === 'POST') {
                appInsightsClient.trackNodeHttpRequest({ request: req, response: res });
            }

            if (!req.body || !req.body.url) {
                return res.render('error', {
                    details: 'Please provide a url.',
                    heading: '',
                    page: {
                        description: `Analyze any public website using webhint's online tool`,
                        title: `webhint's online scanner`
                    }
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

                return res.render('common', {
                    page: {
                        description: `Analyze any public website using webhint's online tool`,
                        title: `webhint's online scanner`
                    },
                    partial: 'scan-error',
                    result: null
                });
            }

            const messagesInQueue = requestResult.messagesInQueue;
            const result = await processHintResults(requestResult);

            appInsightsClient.trackEvent({
                name: 'scanJobCreated',
                properties: {
                    id: result.id,
                    url: result.url
                }
            });

            return res.render('scan', {
                page: {
                    description: `scan result of ${requestResult.url}`,
                    title: `webhint report for ${requestResult.url}`
                },
                result,
                showQueue: typeof messagesInQueue === 'undefined' || messagesInQueue > 20
            });
        };
    }

    app.post('/scanner', scannerPost);
};

module.exports = configure;
