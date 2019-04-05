const constants = require('./update-site/constants');
const { cloneRepo } = require('./update-site/clonerepo');
const { copyFormatter } = require('./update-site/formatter');
const { build, createHintCategories, createResourcesIndexes, escapeNunjucks, getFiles, getFilesInfo, updateChangelog, updateLinks } = require('./update-site/documentation');
const { cleanWorkingSpace, remove } = require('./update-site/remove');

// 1. Clean working space.
cleanWorkingSpace();

// 2. Clone repository.
cloneRepo(constants.REPO_URL, constants.dirs.REPOSITORY);

// 3. Copy formatter.
copyFormatter();

// 4. Get files from hint and resources (hints, formatters, etc.).
getFiles()
    .then((files) => {
        // 5. Get docs information
        return getFilesInfo(files);
    })
    .then((files) => {
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

        return files;
    })
    .then((files) => {
        /*
         * 7. Create index page for all the resources except hints.
         *
         * This will add as many file objects to files as type of
         * resources we have: connectors, formatters, etc.
         */
        createResourcesIndexes(files);

        return files;
    })
    .then((files) => {
        // 8. Update documentation links.
        updateLinks(files);

        return files;
    })
    .then((files) => {
        escapeNunjucks(files);

        return files;
    })
    .then((files) => {
        // 9. Build documentation files in dest.
        return build(files);
    })
    .then(() => {
        // 10. Update Changelog.
        return updateChangelog();
    })
    .then(() => {
        // 11. Remove repository.
        remove(constants.dirs.REPOSITORY, '-rf');
    });
