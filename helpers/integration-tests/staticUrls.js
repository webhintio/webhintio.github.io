const puppeteer = require('puppeteer');

const staticURLsToVerify = [
    'https://sonarwhal-staging.azurewebsites.net/',
    'https://sonarwhal-staging.azurewebsites.net/search/?q=bla',
    'https://sonarwhal-staging.azurewebsites.net/about/changelog/1',
    'https://sonarwhal-staging.azurewebsites.net/docs/user-guide/hints/'
];

const backOffTime = 5000;
const maxRetries = 3;

const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const runPuppeteer = async (url) => {
    const browser = await puppeteer.launch();

    try {
        const page = await browser.newPage();
        const response = await page.goto(url);

        console.log(
            `${
                response.status() === 200 ? '✅ Success' : '❌ Failure'
            }! ${url} => Status: ${response.status()}`
        );

        await browser.close();

        return response.status();
    } catch (error) {
        console.error('🚨 Something went wrong while executing Puppeteer: ', error);
        await browser.close();

        return 0;
    }
};

const runStaticTests = async () => {
    let success = true;
    let retryCount = 0;
    let resultStatus = null;

    for (const url of staticURLsToVerify) {
        resultStatus = await runPuppeteer(url);

        while(resultStatus !== 200 && retryCount < maxRetries) {
            console.log('Test failed, retrying... Attempt #' + (++retryCount));
            await delay(backOffTime * retryCount);
            resultStatus = await runPuppeteer(url);
        }

        success = success && resultStatus === 200;
    }

    return success;
};

module.exports = { runStaticTests };
