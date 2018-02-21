/* global config cp exec ls mv rm */
const Handlebars = require('handlebars');
const _ = require('lodash');
const shell = require('shelljs/global'); // eslint-disable-line no-unused-vars
const fs = require('fs');

const CLONE_URL = 'https://github.com/sonarwhal/sonarwhal.git'; // eslint-disable-line no-process-env
const DEST_DIR = 'src/content';
const DEST_RULES_DIR = `${DEST_DIR}/docs/user-guide/rules`;
const TMP_DIR = require('./mktemp')();
// const TMP_DIR = 'C:/Users/Quing/AppData/Local/Temp/VpB2e';
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
                link: `${rule}/`,
                name: rule.replace(/^rule-/, '')
            };

            return processedRule;
        });

        const processedCategory = {
            name: category,
            rules
        };

        allCategories.push(processedCategory);

        return allCategories;
    }, []);

    return { categories: processedCategories };
};

/** Generate rule index markdown file. */
const getRuleIndexContent = (cats) => {
    Handlebars.registerHelper('capitalize', (str) => {
        const filtered = str.replace(/[^a-zA-Z0-9]/g, ' ');

        return filtered.charAt(0).toUpperCase() + filtered.slice(1);
    });

    const templateContent = fs.readFileSync(`${__dirname}/rule-index-template.hbs`, 'utf8'); //eslint-disable-line no-sync
    const template = Handlebars.compile(templateContent);
    const ruleIndexContent = template(cats);

    return ruleIndexContent;
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

// Generate rule index markdown file.
const processedCategories = processCategories(categories);
const ruleIndexContent = getRuleIndexContent(processedCategories);

fs.writeFileSync(`${DEST_RULES_DIR}/index.md`, ruleIndexContent); //eslint-disable-line no-sync

rm('-rf', TMP_DIR);
