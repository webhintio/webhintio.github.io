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

    if (error) {
        throw new Error('Integration tests completed with errors.');
    }
};

runIntegrationTests()
    .catch((err) => {
        console.error(err.message);
        // Unhandled exceptions in promises do not change the exit code for now
        process.exit(1); //eslint-disable-line
    });
