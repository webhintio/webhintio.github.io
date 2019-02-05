const fs = require('fs');
const path = require('path');

const _ = require('lodash');
const mkdirp = require('mkdirp');
const os = require('os');
const shell = require('shelljs');
const yamlLoader = require('js-yaml');

const constans = require('./constants');
const { safeWriteFile, setShellJSDefaultConfig } = require('./common');

setShellJSDefaultConfig(shell);

/**
 * Create an index file for each type of resource
 * except for hints.
 */
const createIndexFiles = (resources) => {
    resources.forEach((resource) => {
        if (resource.items.length === 0) {
            return;
        }

        const filePath = path.join(resource.dir, 'index.md');

        let content = `# ${resource.title}${os.EOL}${os.EOL}`;

        content += resource.items.reduce((total, item) => {
            return `${total}* [\`${item}\`](./${item}.md)${os.EOL}`;
        }, '');

        safeWriteFile(filePath, content);
    });
};

/*
 * Get the documentation for all the resources and move them
 * to the user guide directory for that resource.
 */
const getDocumentation = () => {
    const resources = new Map([
        ['connector', {
            dir: '',
            items: [],
            title: 'Connectors'
        }],
        ['extension', {
            dir: '',
            items: [],
            title: 'Extensions'
        }],
        ['formatter', {
            dir: '',
            items: [],
            title: 'Formatters'
        }],
        ['parser', {
            dir: '',
            items: [],
            title: 'Parsers'
        }]
    ]);
    const docs = shell.ls('-R', `${constans.dirs.HINT_PACKAGES}/{hint,connector,parser,formatter,extension}-*/{README.md,/docs/*.md}`);

    docs.forEach((docPath) => {
        const docPathSplitted = docPath.split('/').reverse();
        let name;
        let packageJSONPath;

        // Check if the documenation is in a docs folder or in the root of the resource.
        if (docPathSplitted[1] === 'docs') {
            /*
             * If there is a docs folder is because it is a multi-hints hint and
             * we need to build the name using the package name and the hint name.
             * e.g.
             *
             * packages/hint-babel-config/docs/is-valid.md => hint-babel-config/is-valid
             *
             * Also, in this case, the path to the package json needs to be calculated differently.
             */
            name = `${docPathSplitted[2]}/${docPathSplitted[0].replace('.md', '')}`;
            packageJSONPath = path.join(path.dirname(docPath), '..', 'package.json');
        } else {
            /* If there is no docs folder, then the name is the second component in docPathSplitted.
             * The first component should be README.md.
             * e.g.
             * packages/hint-axe/README.md => hint-axe
             */
            name = docPathSplitted[1];
            packageJSONPath = path.join(path.dirname(docPath), 'package.json');
        }

        const docPackage = require(packageJSONPath);

        // If the package is private, ignore it.
        if (docPackage.private) {
            return;
        }

        const nameSplitted = name.split('/');

        /*
         * Get the hint name in multi-hints hint.
         * e.g.
         * hint-babel-config/is-valid => is-valid
         */
        if (nameSplitted.length > 1) {
            name = nameSplitted[nameSplitted.length - 1];
        }

        const type = nameSplitted[0].split('-')[0];
        const dir = path.join(process.cwd(), constans.dirs.USER_GUIDE, `${type}s`, nameSplitted.slice(0, nameSplitted.length - 1).join('/'));

        if (!fs.existsSync(dir)) { // eslint-disable-line no-sync
            mkdirp.sync(dir);
        }

        /*
         * If type !== hint, store in resources the elements for
         * each resource to be able to generate an index file later.
         */
        if (type !== 'hint') {
            const resource = resources.get(type);

            resource.items.push(name);
            resource.dir = dir;
        }

        const destDocPath = `${dir}/${name}.md`;

        shell.mv(docPath, destDocPath);
    });

    createIndexFiles(resources);
};

/**
 * Check if a hint is private.
 */
const isPrivate = (hintPath) => {
    let hintPackagePath = '';

    try {
        hintPackagePath = path.join(path.dirname(hintPath), '..', 'package.json');
        require.resolve(hintPackagePath);
    } catch (e) {
        // Packages is probably multi-hint
        hintPackagePath = '';
    }

    if (!hintPackagePath) {
        hintPackagePath = path.join(path.dirname(hintPath), '..', '..', 'package.json');
    }
    try {
        const hintPackage = require(hintPackagePath);

        return hintPackage.private;
    } catch (e) {
        console.error(`Couldn't load privacy option for ${hintPath}. Making it private by default.`);

        return true;
    }
};

/*
 * Process a hint to be suitable for Hexo.
 * Before: 'hint-amp-validator'
 * After:
 * {
 *     isSummary: false,
 *     link: '/docs/user-guide/hints/hint-amp-validator/'
 *     name: 'amp-validator'
 * }
 */
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
 * Process catogories to be suitable for Hexo.
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

const generateHintCategoryDocAndInfo = () => {
    const configDir = path.resolve(__dirname, '..', '..', '_config.yml');
    const hexoConfig = yamlLoader.safeLoad(fs.readFileSync(configDir, 'utf8')); // eslint-disable-line no-sync
    /*
     * We are reading the metadata information directly from the TS files using regex.
     *
     * Some other option could be to have the packages installed and read the metadata directly from them:
     * e.g:
     *      const meta = require('@hint/hint-axe').default.meta;
     * https://github.com/webhintio/webhint.io/issues/575
     */
    const hints = shell.ls('-R', `${constans.dirs.HINT_PACKAGES}/hint-*/src/{meta/*.ts,./meta.ts}`);

    // Get category information of hints.
    const categories = hints.reduce((acc, hintPath) => {
        if (isPrivate(hintPath)) {
            return acc;
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

            if (acc[category]) {
                acc[category].hints.push(hintName);
            } else {
                acc[category] = {
                    description: hexoConfig.categories[category].description,
                    hints: [hintName],
                    name: hexoConfig.categories[category].name,
                    normalizedName: category
                };
            }
        }

        return acc;
    }, {});

    const processedCategories = processCategories(categories);

    // Create category info file.
    fs.writeFileSync(`${constans.dirs.DATA}/categories.json`, JSON.stringify(processedCategories), 'utf8'); //eslint-disable-line no-sync

    /*
     * Create an index for md file for each category.
     *
     * These files only contain a title. The final content will be filled by Hexo.
     */
    processedCategories.categories.forEach((category) => {
        safeWriteFile(`${constans.dirs.HINTS_DOC}/${category.name}/index.md`, `# ${category.name}${os.EOL}`);
    });
};

module.exports = {
    generateHintCategoryDocAndInfo,
    getDocumentation
};
