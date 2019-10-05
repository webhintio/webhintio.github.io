const puppeteer = require('puppeteer');

const URLsToVerify = [
    'https://sonarwhal-staging.azurewebsites.net/',
    'https://sonarwhal-staging.azurewebsites.net/scanner/',
    'https://sonarwhal-staging.azurewebsites.net/search/?q=bla',
    'https://sonarwhal-staging.azurewebsites.net/about/changelog/1',
    'https://sonarwhal-staging.azurewebsites.net/docs/user-guide/hints/'
];

puppeteer.launch()
    .then((browser) => {
        const responseCollection = new Promise((resolve) => {
            const responses = new Map();

            URLsToVerify.forEach((url, index) => {
                browser.newPage()
                    .then((page) => {
                        page.goto(url)
                            .then((response) => {
                                responses.set(url, response.status());
                            })
                            .catch((error) => {
                                responses.set(url, `❌ ${error}`);
                            })
                            .finally(() => {
                                if (index === (URLsToVerify.length - 1)) {
                                    resolve(responses);
                                    browser.close();
                                }
                            });
                    })
                    .catch((err) => {
                        console.log(`Error on Puppeteer's newPage() function. Info: ${err}`);
                    });
            });
        });

        responseCollection.then((responses) => {
            for (const [url, response] of responses) {
                if (response !== 200) {
                    const error = typeof response === 'number' ? `RESPONSE STATUS => ${response}` : response;

                    throw new Error(`❌ Test failed! A request to the URL ${url} has returned the following error: ${error}`);
                }

                console.log(`✅ Success! ${url} => Status: ${response}`);
            }
        });
    })
    .catch((err) => {
        console.log(`Error on launching Puppeteer. Info: ${err}`);
    });
