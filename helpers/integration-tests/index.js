const { runStaticTests } = require('./staticUrls');
const { runScannerTest } = require('./scanner');

console.log('Integration tests are running...');

const runIntegrationTests = async () => {
    let error = false;

    try {
        for (const test of [runStaticTests, runScannerTest]) {
            const errorFound = await test();

            if (errorFound) {
                error = true;
            }
        }
    } catch (err) {
        error = true;

        console.error(err.message);
    }

    console.log(`${
        error ?
            '🚨 Integration tests completed with errors.' :
            '🏁 Integration tests completed successfully!'
    }`);

    throw new Error('Integration tests completed with errors.');
};

runIntegrationTests();
