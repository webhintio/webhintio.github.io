const puppeteer = require('puppeteer');

const URLsToVerify = [
    'https://sonarwhal-staging.azurewebsites.net/',
    'https://sonarwhal-staging.azurewebsites.net/scanner/',
    'https://sonarwhal-staging.azurewebsites.net/search/?q=bla',
    'https://sonarwhal-staging.azurewebsites.net/about/changelog/1',
    'https://sonarwhal-staging.azurewebsites.net/docs/user-guide/hints/'
];

const runPuppeteer = async (url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const response = await page.goto(url);

    console.log(
        `${
            response.status() === 200 ? '✅ Success' : '❌ Failure'
        }! ${url} => Status: ${response.status()}`
    );

    await browser.close();

    return response.status();
};

console.log('⏳ Integration tests are running...');

URLsToVerify.forEach(async (url, index) => {
    let errorFound = false;
    const resultStatus = await runPuppeteer(url);

    if (resultStatus !== 200) {
        errorFound = true;
    }

    if (index === URLsToVerify.length - 1 && errorFound) {
        throw new Error('🚨 Integration test has failed!');
    }
});
