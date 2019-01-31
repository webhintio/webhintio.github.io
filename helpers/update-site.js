/*
 * 1. Clean working directories.
 * 2. Clone repository.
 * 3. Copy hint files.
 * 4. Copy hints images.
 * 5. Copy Formatter html.
 * 6. Get documentation from each resource.
 * 7. Generate hints category information and documentation.
 * 8. Remove cloned repository.
 * 9. Add frontMatter info to documentation.
 * 10. Update documenattion links.
 * 11. Update Changelog.
 */

const path = require('path');

const globby = require('globby');

const constants = require('./update-site/constants');
const { addFrontMatter, updateChangelog, updateLinks } = require('./update-site/md');
const { cloneRepo } = require('./update-site/clonerepo');
const { cleanWorkingSpace, remove } = require('./update-site/remove');
const { copyHTMLFormatter, copyHintDocumentation, copyResourceImages } = require('./update-site/copy');
const { generateHintCategoryDocAndInfo, getDocumentation } = require('./update-site/resources');

// 1. Clean working space.
cleanWorkingSpace();

// 2. Clone repository.
cloneRepo(constants.REPO_URL, constants.dirs.REPOSITORY);

// 3. Copy 'hint' documenation.
copyHintDocumentation();

/*
 * 4. Copy resources images.
 *
 * If another resource (formatter, connector, extension, etc.) contains
 * images, you need to create the directory and then copy.
 * e.g.:
 *   mkdirp.sync(`${DEST_DIR}/docs/user-guide/connectors/images`);
 *   cp('-R', `${PACKAGES_TMP_DIR}/connectors-* /images`, `${DEST_DIR}/docs/user-guide/connectors/images/`);
 *
 * NOTE: The space between * and / is intentional to not break the multiline comment.
 */
copyResourceImages('hint');
copyResourceImages('formatter');

// 5. Copy formatter HTML.
copyHTMLFormatter();

// 6. Get the documentation for the resources.
getDocumentation();

// 7. Generate hints category information and documentation.
generateHintCategoryDocAndInfo();

// 8. Remove cloned repository
remove(constants.dirs.REPOSITORY, '-rf');

const docFiles = globby.sync(['**/*.md', '!404.md', '!about.md', '!contributors.md', '!docs/index.md'], {
    absolute: true,
    cwd: path.join(process.cwd(), constants.dirs.CONTENT)
});

// 9. Add frontMatter info to documentation.
addFrontMatter(docFiles)
    .then(() => {
        // 10. Update documentation links.
        return updateLinks(docFiles);
    })
    .then(() => {
        // 11. Update Changelog.
        updateChangelog();
    });
