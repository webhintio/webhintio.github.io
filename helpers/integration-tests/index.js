const { runStaticTests } = require('./staticUrls');
const { runScannerTest } = require('./scanner');

console.log('Integration tests are running...');

const runIntegrationTests = async () => {
    const errorFound = await Promise.all([
        runStaticTests(),
        runScannerTest()
    ]);

    console.log(`${
        errorFound ?
            '🚨 Integration tests completed with errors.' :
            '🏁 Integration tests completed successfully!'
    }`);
};

runIntegrationTests();
