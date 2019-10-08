const puppeteer = require('puppeteer');

const runScannerTest = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('https://sonarwhal-staging.azurewebsites.net/scanner/');
    await page.type('#scanner-page-scan', 'https://leosl.github.io/');

    const [response] = await Promise.all([
        page.waitForNavigation(),
        page.click('.button--red')
    ]);

    await browser.close();

    console.log(
        `🧾  Scanner test executed with ${
            response.status() === 200 ? '✅ success' : '❌ failure'
        }! => Status: ${response.status()}`
    );

    return response.status() !== 200;
};

module.exports = { runScannerTest };
