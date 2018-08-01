/* global config cp exec ls mv rm */
const _ = require('lodash');
const getDirname = require('path').dirname;
const mkdirp = require('mkdirp');
const os = require('os');
const shell = require('shelljs/global'); // eslint-disable-line no-unused-vars
const fs = require('fs');
const path = require('path');
const yamlLoader = require('js-yaml');

const configDir = path.resolve(__dirname, '..', '_config.yml');
const hexoConfig = yamlLoader.safeLoad(fs.readFileSync(configDir, 'utf8')); // eslint-disable-line no-sync

const CLONE_URL = 'https://github.com/webhintio/hint.git';
const DEST_DIR = 'src/content';
const SCAN_TEMPLATES = 'src/webhint-theme/layout/partials/scan';
const SCAN_PARTIALS = 'src/webhint-theme/source/js/partials';
const SCAN_SCRIPTS = 'src/webhint-theme/source/js/scan';
const SCAN_IMAGES = 'src/webhint-theme/source/images/scan';
const SCAN_STYLES = 'src/webhint-theme/source/core/css/scan';

const DEST_HINTS_DIR = `${DEST_DIR}/docs/user-guide/hints`;
const DATA_DIR = `${DEST_DIR}/_data`;
const TMP_DIR = require('./mktemp')();
const PACKAGES_TMP_DIR = `${TMP_DIR}/packages`;
const categories = {};

const processHint = (hint, isSummary) => {
    const processedHint = {
        /*
         * For packages with multiple hints we have a summary
         * file with how to install and links to all the hints.
         * This property is used to not take into account in
         * the hint index page total.
         */
        isSummary: isSummary === true,
        link: `/docs/user-guide/hints/${hint}/`,
        name: hint.replace(/^hint-/, '')
    };

    return processedHint;
};

/**
 * Process catogories to be suitable for Handlebars templating.
 * Before: { performance: ['hint-amp-validator'] }
 * After:
 * [{
 *      name: 'performance',
 *      hints: [{
 *          link: 'hint-amp-validator/',
 *          name: 'amp-validator'
 *      }]
 * }]
 */
const processCategories = (cats) => {
    const processedCategories = _.reduce(cats, (allCategories, category) => {
        const includedHints = category.hints;

        const singleHints = includedHints.filter((hintName) => {
            return !hintName.includes('/');
        });

        /*
         * Hints with id: package-name/hint-name will be
         * considered part of a package with multiple hints
         */
        const multiHints = includedHints.filter((hintName) => {
            return hintName.includes('/');
        });

        /*
         * Group hints by package name.
         */
        const packagesName = _.groupBy(multiHints, (hintName) => {
            return hintName.split('/')[0];
        });

        const hints = _.map(singleHints, processHint);

        const multiHintsProcessed = _.reduce(packagesName, (multi, values, key) => {
            // Add an item with the link to the package with multiple hints itself.
            const partial = processHint(key, true);

            multi.push(partial);

            // Add an item for each individual hint for a package with multiple hints.
            return multi.concat(_.map(values, processHint));
        }, []);

        const processedCategory = {
            description: category.description,
            hints: hints.concat(multiHintsProcessed),
            link: `/docs/user-guide/hints/${category.normalizedName}/`,
            name: category.name,
            normalizedName: category.normalizedName
        };

        allCategories.push(processedCategory);

        return allCategories;
    }, []);

    return { categories: processedCategories };
};

config.fatal = true;

exec(`git clone ${CLONE_URL} "${TMP_DIR}"`);

rm('-rf', `${DEST_DIR}/docs/contributor-guide`);
rm('-rf', `${DEST_DIR}/docs/user-guide`);
rm('-rf', `${DEST_DIR}/about`);
rm('-rf', `${SCAN_TEMPLATES}`);
rm('-rf', `${SCAN_PARTIALS}`);
rm('-rf', `${SCAN_IMAGES}`);
rm('-rf', `${SCAN_STYLES}`);
rm('-rf', `${SCAN_SCRIPTS}`);

cp('-R', `${PACKAGES_TMP_DIR}/hint/docs/contributor-guide`, `${DEST_DIR}/docs/contributor-guide`);
cp('-R', `${PACKAGES_TMP_DIR}/hint/docs/user-guide`, `${DEST_DIR}/docs/user-guide`);
cp('-R', `${PACKAGES_TMP_DIR}/hint/docs/about`, `${DEST_DIR}`);
cp(`${PACKAGES_TMP_DIR}/hint/CHANGELOG.md`, `${DEST_DIR}/about`);
cp('-R', `${PACKAGES_TMP_DIR}/hint-*/images`, `${DEST_DIR}/docs/user-guide/hints/images`);
cp('-R', `${PACKAGES_TMP_DIR}/formatter-html/src/views/partials`, `${SCAN_TEMPLATES}`);
cp('-R', `${PACKAGES_TMP_DIR}/formatter-html/src/assets/images/scan`, `${SCAN_IMAGES}`);
cp('-R', `${PACKAGES_TMP_DIR}/formatter-html/src/assets/styles/scan`, `${SCAN_STYLES}`);
cp('-R', `${PACKAGES_TMP_DIR}/formatter-html/src/assets/js/scan`, `${SCAN_SCRIPTS}`);
mkdirp(SCAN_PARTIALS);
cp(`${PACKAGES_TMP_DIR}/formatter-html/src/utils.ts`, `${SCAN_PARTIALS}/utils.ts`);

const hintDocs = ls('-R', `${PACKAGES_TMP_DIR}/hint-*/{README.md,/docs/*.md}`);
const hints = ls('-R', `${PACKAGES_TMP_DIR}/hint-*/src/!(index).ts`);

// Create folder if not exist before writing file.
// Reference: https://stackoverflow.com/a/16317628
const safeWriteFile = (dir, content) => {
    const folderPath = getDirname(dir);

    mkdirp.sync(folderPath);
    fs.writeFileSync(dir, content); // eslint-disable-line no-sync
};

// Update references in scan-result.css
const scanResultPath = path.join(SCAN_STYLES, 'scan-results.css');
const cssContent = fs.readFileSync(scanResultPath, 'utf-8'); // eslint-disable-line no-sync
const newCSSContent = cssContent.replace(/url\("([^"]*)"\)/gi, (matchString, matchGroup) => {
    const newContent = matchGroup.substr(matchGroup.indexOf('/images'));

    return matchString.replace(matchGroup, newContent);
});

safeWriteFile(scanResultPath, newCSSContent);

// Get hint documentations.
hintDocs.forEach((hintDocPath) => {
    const hintDocPathSplitted = hintDocPath.split('/').reverse();
    let hintName;

    if (hintDocPathSplitted[1] === 'docs') {
        hintName = `${hintDocPathSplitted[2]}/${hintDocPathSplitted[0].replace('.md', '')}`;

        mkdirp.sync(path.join(process.cwd(), DEST_HINTS_DIR, path.dirname(hintName)));
    } else {
        hintName = hintDocPathSplitted[1];
    }

    const destHintDocPath = `${DEST_HINTS_DIR}/${hintName}.md`;

    mv(hintDocPath, destHintDocPath);
});

// Get category information of hints.
hints.forEach((hintPath) => {
    const hintContent = fs.readFileSync(hintPath, 'utf8'); // eslint-disable-line no-sync
    const hintNameRegex = /id:\s*'([^']*)'/;
    const hintNameMatch = hintContent.match(hintNameRegex);
    const categoryRegex = /category:\s*Category\.([a-z]*)/;
    const categoryMatch = hintContent.match(categoryRegex);

    // If we don't find the category or the name, we will assume that it is not a hint.
    if (categoryMatch && hintNameMatch) {
        const category = categoryMatch.pop();
        const hintName = `hint-${hintNameMatch.pop()}`;

        if (categories[category]) {
            categories[category].hints.push(hintName);
        } else {
            categories[category] = {
                description: hexoConfig.categories[category].description,
                hints: [hintName],
                name: hexoConfig.categories[category].name,
                normalizedName: category
            };
        }
    }
});

// Generate JSON file that contains the category-hint information.
const processedCategories = processCategories(categories);

fs.writeFileSync(`${DATA_DIR}/categories.json`, JSON.stringify(processedCategories), 'utf8'); //eslint-disable-line no-sync

processedCategories.categories.forEach((category) => {
    safeWriteFile(`${DEST_HINTS_DIR}/${category.name}/index.md`, `# ${category.name}${os.EOL}`);
});

rm('-rf', TMP_DIR);
