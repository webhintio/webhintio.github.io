const puppeteer = require('puppeteer');

const staticURLsToVerify = [
    'https://sonarwhal-staging.azurewebsites.net/',
    'https://sonarwhal-staging.azurewebsites.net/search/?q=bla',
    'https://sonarwhal-staging.azurewebsites.net/about/changelog/1',
    'https://sonarwhal-staging.azurewebsites.net/docs/user-guide/hints/'
];

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
    let errorFound = false;

    for (const url of staticURLsToVerify) {
        const resultStatus = await runPuppeteer(url);

        if (resultStatus !== 200) {
            errorFound = true;
        }
    }

    return errorFound;
};

module.exports = { runStaticTests };
