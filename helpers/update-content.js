/* global config cp exec ls mv rm */
const _ = require('lodash');
const getDirname = require('path').dirname;
const mkdirp = require('mkdirp');
const os = require('os');
const shell = require('shelljs/global'); // eslint-disable-line no-unused-vars
const fs = require('fs');

const CLONE_URL = 'https://github.com/sonarwhal/sonarwhal.git'; // eslint-disable-line no-process-env
const DEST_DIR = 'src/content';
const DEST_RULES_DIR = `${DEST_DIR}/docs/user-guide/rules`;
const DATA_DIR = `${DEST_DIR}/_data`;
const TMP_DIR = require('./mktemp')();
const PACKAGES_TMP_DIR = `${TMP_DIR}/packages`;
const categories = {};

/**
 * Process catogories to be suitable for Handlebars templating.
 * Before: { performance: ['rule-amp-validator'] }
 * After:
 * [{
 *      name: 'performance',
 *      rules: [{
 *          link: 'rule-amp-validator/',
 *          name: 'amp-validator'
 *      }]
 * }]
 */
const processCategories = (cats) => {
    const processedCategories = _.reduce(cats, (allCategories, includedRules, category) => {
        const rules = _.map(includedRules, (rule) => {
            const processedRule = {
                link: `/docs/user-guide/rules/${rule}/`,
                name: rule.replace(/^rule-/, '')
            };

            return processedRule;
        });

        const processedCategory = {
            link: `/docs/user-guide/rules/${category}/`,
            name: category,
            rules
        };

        allCategories.push(processedCategory);

        return allCategories;
    }, []);

    return { categories: processedCategories };
};

config.fatal = true;

exec(`git clone ${CLONE_URL}  "${TMP_DIR}"`);

rm('-rf', `${DEST_DIR}/docs/contributor-guide`);
rm('-rf', `${DEST_DIR}/docs/user-guide`);
rm('-rf', `${DEST_DIR}/about`);

cp('-R', `${PACKAGES_TMP_DIR}/sonarwhal/docs/contributor-guide`, `${DEST_DIR}/docs/contributor-guide`);
cp('-R', `${PACKAGES_TMP_DIR}/sonarwhal/docs/user-guide`, `${DEST_DIR}/docs/user-guide`);
cp('-R', `${PACKAGES_TMP_DIR}/sonarwhal/docs/about`, `${DEST_DIR}`);
cp(`${PACKAGES_TMP_DIR}/sonarwhal/CHANGELOG.md`, `${DEST_DIR}/about`);

const ruleDocs = ls('-R', `${PACKAGES_TMP_DIR}/rule-*/README.md`);
const rules = ls('-R', `${PACKAGES_TMP_DIR}/rule-*/src/rule.ts`);

// Create folder if not exist before writing file.
// Reference: https://stackoverflow.com/a/16317628
const safeWriteFile = (dir, content) => {
    const folderPath = getDirname(dir);

    return mkdirp(folderPath, (err) => {
        if (err) {
            console.error(`Error creating path ${folderPath}: ${err.message}.`);
        }

        fs.writeFile(dir, content);
    });
};

// Get rule documentations.
ruleDocs.forEach((ruleDocPath) => {
    const ruleName = ruleDocPath.split('/').reverse()[1];
    const destRuleDocPath = `${DEST_RULES_DIR}/${ruleName}.md`;

    mv(ruleDocPath, destRuleDocPath);
});

// Get category information of rules.
rules.forEach((rulePath) => {
    const ruleContent = fs.readFileSync(rulePath, 'utf8'); // eslint-disable-line no-sync
    const ruleName = rulePath.split('/').reverse()[2];
    const categoryRegex = /category:\s*Category\.([a-z]*)/;
    const category = ruleContent.match(categoryRegex).pop();

    if (categories[category]) {
        categories[category].push(ruleName);
    } else {
        categories[category] = [ruleName];
    }
});

// Generate JSON file that contains the category-rule information.
const processedCategories = processCategories(categories);

fs.writeFileSync(`${DATA_DIR}/categories.json`, JSON.stringify(processedCategories), 'utf8'); //eslint-disable-line no-sync

processedCategories.categories.forEach((category) => {
    safeWriteFile(`${DEST_RULES_DIR}/${category.name}/index.md`, `# ${category.name}${os.EOL}`);
});

rm('-rf', TMP_DIR);
