const { install } = require('./update-site/install');
const { copyFormatter } = require('./update-site/formatter');
const { build, createHintCategories, createResourcesIndexes, escapeNunjucks, getFiles, getFilesInfo, updateChangelog, updateLinks } = require('./update-site/documentation');
const { cleanWorkingSpace } = require('./update-site/remove');

// 1. Clean working space.
cleanWorkingSpace();

// 2. Install dependencies.
console.log('Installing dependencies...');
install();

// 3. Copy formatter.
copyFormatter();

// 4. Get files from hint and resources (hints, formatters, etc.).
getFiles()
    .then(async (files) => {
        // 5. Get docs information
        getFilesInfo(files);

        /*
         * 6. Create categories for hints.
         *
         * This will add as many file objects to files as categories
         * we have for the hints.
         * Also, this will create a file `categories.json` that will
         * be use to build the index page for the HINTS section and
         * an index page for each category.
         *
         * The layout that will use `categories.json` is `hints-index.ejs`
         * and `hints-category.ejs`
         */
        createHintCategories(files);

        /*
         * 7. Create index page for all the resources except hints.
         *
         * This will add as many file objects to files as type of
         * resources we have: connectors, formatters, etc.
         */
        createResourcesIndexes(files);

        // 8. Update documentation links.
        updateLinks(files);

        // 9. Escape Nunjucks
        escapeNunjucks(files);

        // 10. Build documentation files in dest.
        await build(files);

        // 11. Update Changelog.
        await updateChangelog();
    });
