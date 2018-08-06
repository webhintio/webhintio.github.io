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
const webhintUrl = urlAudiences ? `${urlAudiences.split(',')[0]}/` : 'http://localhost:4000/';
const serviceEndpoint = process.env.SONAR_ENDPOINT || 'http://localhost:3000/'; // eslint-disable-line no-process-env
const underConstruction = process.env.UNDER_CONSTRUCTION; // eslint-disable-line no-process-env
let thirdPartyServiceConfig; // eslint-disable-line no-sync
const layout = 'scan';
const jobStatus = {
    error: 'error',
    finished: 'finished',
    pending: 'pending',
    started: 'started',
    warning: 'warning'
};
const hintStatus = {
    error: 'error',
    pass: 'pass',
    pending: 'pending',
    warning: 'warning'
};

const noDocHints = ['optimize-image'];

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

const updateLink = (thirdPartyInfo, scanUrl) => {
    if (!thirdPartyInfo.link) {
        return thirdPartyInfo;
    }

    const thirdPartyInfoCopy = Object.assign({}, thirdPartyInfo);

    thirdPartyInfoCopy.link = thirdPartyInfo.link.replace(/%URL%/, scanUrl);

    return thirdPartyInfoCopy;
};

const parseCategories = (hints, scanUrl) => {
    let categories = [];

    hints.forEach((hint) => {
        let category = _.find(categories, (cat) => {
            return cat.name === hint.category;
        });

        if (!category) {
            category = {
                hints: [],
                name: hint.category,
                results: null
            };

            categories.push(category);
        }

        const thirdPartyInfo = thirdPartyServiceConfig[hint.name];

        if (thirdPartyInfo) {
            hint.thirdParty = updateLink(thirdPartyInfo, scanUrl);
        }

        hint.hasDoc = !noDocHints.includes(hint.name);

        category.hints.push(hint);

        if (hint.status !== hintStatus.pending) {
            // Passed hints are included in the results.
            if (!category.results) {
                category.results = [];
            }

            category.results.push(hint);
        }
    });

    categories = _.sortBy(categories, (category) => {
        return category.name;
    });

    return categories;
};

/** Process scanning result to add category and statistics information */
const processHintResults = (hintResults, scanUrl, images) => {
    const overallStatistics = {
        errors: 0,
        warnings: 0
    };

    const categories = parseCategories(hintResults, scanUrl);

    // Caculate numbers of `errors` and `warnings`.
    _.forEach(categories, (category) => {
        const statistics = _.reduce(category.results || [], (count, hint) => {
            if (hint && hint.status === hintStatus.error) {
                count.errors += hint.messages.length;
                overallStatistics.errors += hint.messages.length;
            }

            if (hint && hint.status === hintStatus.warning) {
                count.warnings += hint.messages.length;
                overallStatistics.warnings += hint.messages.length;
            }

            return count;
        }, { errors: 0, warnings: 0 });

        category.statistics = statistics;
        category.image = images[category.name];
    });

    return { categories, overallStatistics };
};

const configure = (app, appInsightsClient) => {
    const thirdPartyServiceConfigPath = path.join(app.get('themeDir'), 'source', 'static', 'third-party-service-config.yml');
    const categoryImages = JSON.parse(fs.readFileSync(path.join(app.get('themeDir'), 'source', 'static', 'category-images.json'))); // eslint-disable-line no-sync

    thirdPartyServiceConfig = yaml.safeLoad(fs.readFileSync(thirdPartyServiceConfigPath, 'utf8')); // eslint-disable-line no-sync

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

            return res.render('under-construction');
        };
    } else {
        scanner = (req, res) => {
            res.set('Cache-Control', 'no-cache');

            if (req.method === 'GET') {
                appInsightsClient.trackNodeHttpRequest({ request: req, response: res });
            }
            res.render('scan-form', {
                layout,
                page: {
                    description: `Analyze any public website using webhint's online tool`,
                    title: `webhint's online scanner`
                }
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

        const { categories, overallStatistics } = processHintResults(scanResult.hints || scanResult.rules, scanResult.url, categoryImages);

        return res.send({
            categories,
            overallStatistics,
            status: scanResult.status,
            time: calculateTimeDifference(scanResult.started, scanResult.status === jobStatus.finished ? scanResult.finished : void 0),
            version: scanResult.webhintVersion || scanResult.sonarVersion
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

        const { categories, overallStatistics } = processHintResults(scanResult.hints || scanResult.rules, scanResult.url, categoryImages);
        const renderOptions = {
            categories,
            id: scanResult.id,
            isFinish: scanResult.status === jobStatus.error || scanResult.status === jobStatus.finished,
            layout,
            overallStatistics,
            page: {
                description: `webhint has identified ${overallStatistics.errors} errors and ${overallStatistics.warnings} warnings in ${scanResult.url}`,
                title: `webhint report for ${scanResult.url}`
            },
            permalink: `${webhintUrl}scanner/${scanResult.id}`,
            showQueue: false,
            status: scanResult.status,
            time: calculateTimeDifference(scanResult.started, (scanResult.status === jobStatus.finished || scanResult.status === jobStatus.error) ? scanResult.finished : void 0),
            url: scanResult.url,
            version: scanResult.webhintVersion || scanResult.sonarVersion
        };

        res.set('Cache-Control', 'max-age=180');
        res.render('scan-result', renderOptions);
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
            return res.render('under-construction');
        };
    } else {
        scannerPost = async (req, res) => {
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
            const { categories, overallStatistics } = processHintResults(requestResult.hints || requestResult.rules, req.body.url, categoryImages);

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
                page: {
                    description: `scan result of ${requestResult.url}`,
                    title: `webhint report for ${requestResult.url}`
                },
                permalink: `${webhintUrl}scanner/${id}`,
                showQueue: messagesInQueue || (status === jobStatus.pending && typeof messagesInQueue === 'undefined'),
                status,
                url: req.body.url
            });
        };
    }

    app.post('/scanner', scannerPost);
};

module.exports = configure;
