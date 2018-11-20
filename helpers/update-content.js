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

const DEST_DOC_DIR = `${DEST_DIR}/docs/user-guide`;
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

/*
 * Create the directory before copy files, just in case
 * more than one hint contain images.
 */
mkdirp.sync(`${DEST_DIR}/docs/user-guide/hints/images`);
cp('-R', `${PACKAGES_TMP_DIR}/hint-*/images`, `${DEST_DIR}/docs/user-guide/hints/images`);
/*
 * If another resource (formatter, connector, extension, etc.) contains
 * images, you need to create the directory and then copy.
 * e.g.:
 *   mkdirp.sync(`${DEST_DIR}/docs/user-guide/connectors/images`);
 *   cp('-R', `${PACKAGES_TMP_DIR}/connectors-* /images`, `${DEST_DIR}/docs/user-guide/connectors/images/`);
 *
 * NOTE: The space between * and / is intentional to not break the multiline comment.
 */
mkdirp.sync(`${DEST_DIR}/docs/user-guide/formatters/images`);
cp('-R', `${PACKAGES_TMP_DIR}/formatter-*/images`, `${DEST_DIR}/docs/user-guide/formatters/images/`);
cp('-R', `${PACKAGES_TMP_DIR}/formatter-html/src/views/partials`, `${SCAN_TEMPLATES}`);
cp('-R', `${PACKAGES_TMP_DIR}/formatter-html/src/assets/images/scan`, `${SCAN_IMAGES}`);
cp('-R', `${PACKAGES_TMP_DIR}/formatter-html/src/assets/styles/scan`, `${SCAN_STYLES}`);
cp('-R', `${PACKAGES_TMP_DIR}/formatter-html/src/assets/js/scan`, `${SCAN_SCRIPTS}`);
mkdirp(SCAN_PARTIALS);
cp(`${PACKAGES_TMP_DIR}/formatter-html/src/utils.ts`, `${SCAN_PARTIALS}/utils.ts`);

const docs = ls('-R', `${PACKAGES_TMP_DIR}/{hint,connector,parser,formatter,extension}-*/{README.md,/docs/*.md}`);
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
docs.forEach((docPath) => {
    const docPathSplitted = docPath.split('/').reverse();
    let name;
    let packageJSONPath;

    if (docPathSplitted[1] === 'docs') {
        name = `${docPathSplitted[2]}/${docPathSplitted[0].replace('.md', '')}`;
        packageJSONPath = path.join(path.dirname(docPath), '..', 'package.json');
    } else {
        name = docPathSplitted[1];
        packageJSONPath = path.join(path.dirname(docPath), 'package.json');
    }

    const docPackage = require(packageJSONPath);

    if (docPackage.private) {
        return;
    }

    const type = name.split('-')[0];
    const dir = path.join(process.cwd(), DEST_DOC_DIR, `${type}s`);

    if (!fs.existsSync(dir)) { // eslint-disable-line no-sync
        mkdirp.sync(dir);
    }

    const destDocPath = `${dir}/${name}.md`;

    mv(docPath, destDocPath);
});

// Get category information of hints.
hints.forEach((hintPath) => {
    const hintPackagePath = path.join(path.dirname(hintPath), '..', 'package.json');
    const hintPackage = require(hintPackagePath);

    if (hintPackage.private) {
        return;
    }

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
