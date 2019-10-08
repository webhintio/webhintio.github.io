const puppeteer = require('puppeteer');

const staticURLsToVerify = [
    'https://sonarwhal-staging.azurewebsites.net/',
    'http://pudim.com.br/xunda.jpg',
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

const runStaticTests = () => {
    return new Promise((resolve) => {
        let errorFound = false;

        staticURLsToVerify.forEach(async (url, index) => {
            const resultStatus = await runPuppeteer(url);

            if (resultStatus !== 200) {
                errorFound = true;
            }

            if (index === staticURLsToVerify.length - 1) {
                resolve(errorFound);
            }
        });
    });
};

module.exports = { runStaticTests };
