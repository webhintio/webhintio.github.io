const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const _ = require('lodash');
const globby = require('globby');
const marked = require('marked');
const md2json = require('md-2-json');
const normalize = require('normalize-path');
const os = require('os');
const shell = require('shelljs');
const stripMarkdown = require('remove-markdown');
const yamlLoader = require('js-yaml');
const utils = require('@hint/utils');

const constants = require('./constants');
const { copy } = require('./copy');
const { setShellJSDefaultConfig } = require('./common');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const i18n = utils.i18n.getMessage;
const divider = '---';
const frontMatterRegex = new RegExp(`\r?\n\s*${divider}\r?\n|^\s*${divider}\r?\n`, 'gi'); // eslint-disable-line no-useless-escape
const configDir = path.resolve(__dirname, '..', '..', '_config.yml');
const config = yamlLoader.safeLoad(fs.readFileSync(configDir, 'utf8')); // eslint-disable-line no-sync

setShellJSDefaultConfig(shell);

// Make sure the options used here are the same as used in `hexo`.
marked.setOptions(config.marked);

const types = {
    doc: 'doc',
    other: 'other'
};

const hintDocumentationPaths = [
    {
        dest: constants.dirs.CONTRIBUTOR_GUIDE,
        orig: `${constants.dirs.NODE_MODULES}/hint/docs/contributor-guide`,
        section: 'contributor-guide'
    },
    {
        dest: constants.dirs.USER_GUIDE,
        orig: `${constants.dirs.NODE_MODULES}/hint/docs/user-guide`,
        section: 'user-guide'
    },
    {
        dest: constants.dirs.ABOUT,
        orig: `${constants.dirs.NODE_MODULES}/hint/docs/about`,
        section: 'about'
    }
];

const resources = [
    'configuration',
    'connector',
    'extension',
    'formatter',
    'hint',
    'parser'
];

const trimAndUnquote = (string) => {
    return string.trim().replace(/^"|"$/, '');
};

/** Convert frontmatter string to object. */
const frontMatterToObject = (frontMatter) => {
    const frontmatterObject = {};
    const frontMatterItemRegex = /(.*):\s*"?(.*)"?/g; // `property: "value"` or `property: value`.
    let match = frontMatterItemRegex.exec(frontMatter);

    while (match !== null) {
        frontmatterObject[match[1]] = trimAndUnquote(match[2]);
        match = frontMatterItemRegex.exec(frontMatter);
    }

    return frontmatterObject;
};

/**
 * Give a file, return the parsed frontMatter and
 * the content without the frontMatter section.
 * If there is no frontMatter in the content, the
 * property frontMatter will be undefined.
 */
const getExistingContent = async (file) => {
    const data = await readFile(file, 'utf-8');
    let currentFrontMatter;
    let content;
    let frontMatter;

    if (frontMatterRegex.test(data)) {
        // front matter already exists in this file, will update it
        [, currentFrontMatter, content] = data.split(frontMatterRegex); // ['', '<front matter>', '<Actual content in the markdown file>']
        frontMatter = frontMatterToObject(currentFrontMatter);
    } else {
        content = data;
    }

    return {
        content,
        frontMatter
    };
};

/**
 * Create a file object for each documentation file (image/md)
 * in the folder packages/hint in the hint repository, and return
 * an array with those files.
 */
const getHintFiles = async () => {
    // Solution found in: https://gyandeeps.com/array-reduce-async-await/
    const promise = hintDocumentationPaths.reduce(async (previousPromise, docPath) => {
        const allFiles = await previousPromise;
        const files = await globby([`${docPath.orig}${!docPath.orig.endsWith('.md') ? '/**/*' : ''}`]);

        const newFiles = [];

        for (const file of files) {
            const type = file.endsWith('.md') ? types.doc : types.other;
            let frontMatter;
            let content;

            if (type === types.doc) {
                ({ content, frontMatter } = await getExistingContent(file));
            }

            newFiles.push({
                content,
                // if the docPath is a file instead of a dir, take the filename to concat with docPath.dest
                dest: path.join(docPath.dest, docPath.orig.length !== file.length ? file.substr(docPath.orig.length) : path.basename(file)),
                frontMatter,
                orig: file,
                section: docPath.section,
                type
            });
        }

        return allFiles.concat(newFiles);
    }, Promise.resolve([]));

    const data = await promise;

    return data;
};

/**
 * Create a file object for an image in a resource
 * documentation.
 */
const getImageItemFromResource = (imagePath, resource) => {
    return {
        dest: path.join(constants.dirs.USER_GUIDE, `${resource}s`, 'images', imagePath.substr(imagePath.lastIndexOf('/images/') + '/images/'.length)),
        orig: imagePath,
        type: types.other
    };
};

/**
 * Create a file object for each documentation
 * file in any resource (hints, formatters, etc.),
 * and return an array with those files.
 */
const getResourcesFiles = async () => {
    const imageFiles = [];

    for (const resource of resources) {
        const images = await globby([`${constants.dirs.NODE_MODULES}/@hint/{${resource}-*,configuration-all/node_modules/@hint/${resource}-*}/images/**/*`], { absolute: true });

        images.forEach((image) => {
            imageFiles.push(getImageItemFromResource(image, resource));
        });
    }

    const docs = await globby([`${constants.dirs.NODE_MODULES}/@hint/{${resources.join(',')},configuration-all/node_modules/@hint/{${resources.join(',')}}}-*/{README.md,docs/*.md}`], { absolute: true });

    const promises = docs.map(async (doc) => {
        const { content, frontMatter } = await getExistingContent(doc);

        const docPathSplitted = doc.split('/').reverse();
        let name;
        let packagePath;
        let metaPath;
        let isMulti = false;

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
            packagePath = path.join(path.dirname(doc), '..');
            metaPath = path.join(packagePath, 'dist', 'src', 'meta', `${path.basename(doc, '.md')}.js`);
            isMulti = true;
        } else {
            /* If there is no docs folder, then the name is the second component in docPathSplitted.
             * The first component should be README.md.
             * e.g.
             * packages/hint-axe/README.md => hint-axe
             */
            name = docPathSplitted[1];
            packagePath = path.join(path.dirname(doc));
            metaPath = path.join(packagePath, 'dist', 'src', 'meta.js');
        }

        const packageJSONPath = path.join(packagePath, 'package.json');
        const sourcePath = path.join(packagePath, 'dist', 'src');

        const docPackage = require(packageJSONPath);

        // If the package is private, ignore it.
        if (docPackage.private) {
            return null;
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

        const resourceType = nameSplitted[0].split('-')[0];
        const dir = path.join(process.cwd(), constants.dirs.USER_GUIDE, `${resourceType}s`, nameSplitted.slice(0, nameSplitted.length - 1).join('/'));
        const dest = `${dir}/${name}.md`;

        return {
            content,
            dest,
            frontMatter,
            isMulti,
            metaPath,
            name,
            orig: doc,
            resourceType,
            sourcePath,
            type: types.doc
        };
    });

    const docFiles = (await Promise.all(promises)).filter((item) => {
        return item !== null;
    });

    return docFiles.concat(imageFiles);
};

/**
 * Get all files for the documentation in the repository.
 */
const getFiles = async () => {
    const hintFiles = await getHintFiles();
    const resourceFiles = await getResourcesFiles();

    return hintFiles.concat(resourceFiles);
};

/**
 * Return the content type for a md file.
 * * hints-index: It is a file with the index of categories for all the hints.
 * * index: It is an index file.
 * * details: It is a document file.
 * @param {string} originalFile - Original path for the file.
 * @param {boolean} isHintsCategory - Indicate if the file contains a hints category.
 */
const getContentType = (originalFile) => {
    if (originalFile.endsWith('/hints/index.md')) {
        return 'hints-index';
    }

    return originalFile.endsWith('/index.md') ? 'index' : 'details';
};

/** Applies the predefined description specified in the _config.yml if the path matches. */
const getPredefinedDescription = (filePath) => {
    const descriptions = Object.entries(config.descriptions);
    const description = descriptions.find(([name]) => {
        // There are entries with paths, we need to normalize to the current platform and this is the shortest way
        return filePath.toLowerCase().includes(path.join(name, ''));
    });

    if (description) {
        return description[1];
    }

    return '';
};

/** Gets the description of a hint by extracting the first section before "Why is this important" */
const getDescription = (content) => {
    const descriptionRegex = /#\s.*\(.*\)([\s\S]*?)## Why is this important?/;
    // Extract the content between h1 title and  `## Why is this important?`.
    const descriptionMatch = content.match(descriptionRegex);

    if (!descriptionMatch || !descriptionMatch[1]) {
        return '';
    }

    const processedDescription = descriptionMatch[1].replace(/\r?\n/g, ' ').replace(/(["])/g, '\\$1')
        .trim();

    // Line breaks need to be removed first so that `stripMarkdown` works properly.
    // Double quotes need to be escaped so that `hexo` works properly.
    return stripMarkdown(processedDescription);
};

/** Changes the layout of a page if it needs a custom one.  */
const getLayout = (filePath) => {
    const validLayouts = ['changelog', 'docs', '404', 'about'];

    const current = validLayouts.find((template) => {
        return filePath.toLowerCase().includes(template);
    });

    return current;
};

/**
 * Extract the first title in markdown file and remove the abbreviation in parenthesis
 * e.g:
 *      '\r\n# Disallow certain HTTP headers (`disallow-headers`)\r\n\r\n' => 'Disallow certain HTTP headers'
 * @param {string} content - File content.
 */
const getTitle = (content) => {
    const titleMatch = content.match(/# (.*)(\n|\r\n)/);
    let title;

    if (titleMatch) {
        title = titleMatch[1].replace(/\(.*\)/, '').trim();
    }

    return title;
};

/**
 * Add or update the frontMatter for all the documentation
 * files (only .md files).
 * This method is not used to get the info for 'hints'.
 */
const getFileInfo = (file) => {
    const existingFrontMatter = file.frontMatter;
    let relativePath = path.relative(constants.dirs.CONTENT, file.dest);
    let root = '';
    let baseName;

    if (relativePath.startsWith('docs')) {
        relativePath = path.relative('docs', relativePath);
        root = 'docs';
    }

    baseName = path.basename(relativePath, '.md');
    baseName = baseName !== 'index' ? baseName : '';

    const splittedPath = path.dirname(relativePath).split(path.sep);
    const section = splittedPath[0];
    const tocTitle = splittedPath[1];

    const originalFile = normalize(path.join(root, relativePath)).toLowerCase();
    const newFrontMatter = {
        contentType: getContentType(originalFile),
        description: getPredefinedDescription(file.dest) || getDescription(file.content),
        isMultiHints: file.isMulti,
        // Define witch ejs layout is going to be used for Hexo.
        layout: getLayout(file.dest),
        originalFile,
        permalink: normalize(path.join(root, path.dirname(relativePath), baseName, 'index.html')).toLowerCase(),
        /**
         * Main section in the website.
         * Values can be 'about', 'contributor-guide' or 'user-guide'
         */
        section,
        title: getTitle(file.content),
        tocTitle: tocTitle ? tocTitle.replace(/-/g, ' ') : tocTitle
    };

    // Override frontmatter if there are existing frontmatter values.
    file.frontMatter = Object.assign(newFrontMatter, existingFrontMatter);

    return file;
};

/**
 * Get the metadata content for a hint given its .md file.
 */
const getMeta = (file) => {
    let meta;

    try {
        meta = require(file.metaPath).default;
    } catch (e) {
        meta = null;
    }

    return meta;
};

const getDescriptionMeta = (meta, file) => {
    const hintIdSplit = meta.id.split('/');
    const hintId = file.isMulti ? hintIdSplit[hintIdSplit.length - 1] : meta.id;

    if (!file.isMulti) {
        return i18n('description', file.sourcePath);
    }

    return i18n(`${_.camelCase(hintId)}_description`, file.sourcePath);
};

/**
 * Add or update the frontMatter for all the hints.
 * Hints are in a separete method because for them,
 * we can get the information from the metadata.
 */
const getHintFileInfo = (file) => {
    const relativePath = path.relative(path.join(constants.dirs.CONTENT, 'docs'), file.dest);
    const root = 'docs';
    const isMultiHints = file.isMulti;
    const meta = getMeta(file);

    if (meta) {
        // In multi-hints, the name will change to be hint/subhint.
        file.name = meta.id;
        file.category = meta.docs.category;
    }

    /*
     * If the description contains '\`' to scape the character `, we
     * need replace it for the character `, or hexo will not generate
     * the html.
     *
     * e.g.    this is a \`description\` => this is a `description`
     *
     * Also, if the description contain the character non-escaped, we need
     * to scape it, to avoid problems with hexo.
     *
     * e.g.    this is a "description" => this is a \"description\"
     */
    let description = meta ?
        getDescriptionMeta(meta, file)
            .trim()
            .replace(/\\`/g, '`') :
        (getPredefinedDescription(file.dest) || getDescription(file.content));

    description = description.replace(/([^\\])"/g, '$1\\"');

    let baseName = path.basename(relativePath, '.md');

    baseName = baseName !== 'index' ? baseName : '';

    const originalFile = normalize(path.join(root, relativePath)).toLowerCase();
    const splittedPath = path.dirname(relativePath).split(path.sep);
    const section = splittedPath[0];
    const tocTitle = splittedPath[1];

    const newFrontMatter = {
        contentType: getContentType(originalFile),
        description,
        isMultiHints,
        // Define witch ejs layout is going to be used for Hexo.
        layout: getLayout(file.dest),
        originalFile,
        permalink: normalize(path.join(root, path.dirname(relativePath), baseName, 'index.html')).toLowerCase(),
        /**
         * Main section in the website.
         * Values can be 'about', 'contributor-guide' or 'user-guide'
         */
        section,
        title: getTitle(file.content),
        tocTitle: tocTitle ? tocTitle.replace(/-/g, ' ') : tocTitle
    };

    file.frontMatter = Object.assign(newFrontMatter, file.frontMatter);
};

/**
 * Get the frontMatter info for all the md files.
 */
const getFilesInfo = (files) => {
    // Hint documentation is going to take the info from the metadata.
    const hintFiles = files.filter((file) => {
        return file.type !== types.other && file.resourceType === 'hint';
    });

    const noHintFiles = files.filter((file) => {
        return file.type !== types.other && file.resourceType !== 'hint';
    });

    noHintFiles.forEach(getFileInfo);

    hintFiles.map(getHintFileInfo);

    return files;
};

/** Updates the markdown links to other parts of the documentation, i.e.: start with "./" */
const updateMarkdownlinks = (content, filePath) => {
    /**
     * This regex should match the following examples:
     * * [link label]: ./somewhere.md → \s
     * * [link label]:./somewhere.md → :
     * * [link](./somewhere.md)  → \(
     *
     * The \.? allow us to also match "../"
     */
    const mdLinkRegex = /(\s|:|\()\.?\.\/(\S*?)\.md/gi;
    const isIndex = filePath.toLowerCase().endsWith('index.md');
    let transformed = content;
    let val;

    while ((val = mdLinkRegex.exec(content)) !== null) {
        /**
         * Pages in the live site are `index.html` inside a folder with the name of the original page. E.g.:
         *
         * * `/user-guide/concepts/connectors.md` → `/user-guide/concepts/connectors/
         *
         * The exceptions are `index.md` and `readm.md`, which become the `index.html` of the folder where
         * they are. These are considered "index" pages. E.g.:
         *
         * * `/user-guide/index.md` → `/user-guide/`
         * * `/hint-name/readme.md` → `/hint-name/`
         *
         * For that reason, links that end with `index.md` or `readme.md` replace that string with an empty
         * one, and in the opposite case replace the `.md` part with `/`.
         *
         * Because we are creating new folders, we need to adjust the relative paths as well for the pages that
         * are not "index" pages. E.g.:
         *
         * * If `architecture.md` has a link to `./events.md`, in the live site it will be `/architecture/` and
         *   thus the link to the events page should be `../events/`.
         * * If it were `../events.md`, in that case we will have to navigate one more folder up: `../../events/`.
         */
        let replacement = val[0].toLowerCase().endsWith('index.md') || val[0].toLowerCase().endsWith('readme.md') ?
            val[0].replace(/(index|readme)\.md/i, '') :
            val[0].replace('.md', '/');

        /**
         * If val[0] contains './docs/ then, it is part of a multi-hint hint, so
         * we need to ignore it.
         * Later in the the `link-filter.js`, the link will be replaced for the final one.
         */
        if (!val[0].includes('./docs/')) {
            /**
             * `val[1] is the first capturing group. It could be "\s", ":", or "("
             * and it's part of the matched value so we need to add it at the beginning as well. E.g.:
             *
             * * `[events](./events.md)` will match `(./events.md` that needs to be transformed into `(../events/`.
             */
            if (replacement.startsWith(`${val[1]}./`) && !isIndex) {
                replacement = replacement.replace(`${val[1]}./`, `${val[1]}../`);
            } else if (replacement.startsWith(`${val[1]}../`) && !isIndex) {
                replacement = replacement.replace(`${val[1]}../`, `${val[1]}../../`);
            }
        }

        transformed = transformed.replace(val[0], replacement);
    }

    return transformed;
};

const updateLinks = (files) => {
    files.forEach((file) => {
        if (file.type === types.other) {
            return;
        }

        file.content = updateMarkdownlinks(file.content, file.orig || file.dest);
    });
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
        friendlyName: hint.friendlyName,
        /*
         * For packages with multiple hints we have a summary
         * file with how to install and links to all the hints.
         * This property is used to not take into account in
         * the hint index page total.
         */
        isSummary: isSummary === true,
        link: `/docs/user-guide/hints/hint-${hint.name}/`,
        name: hint.name.replace(/^hint-/, '')
    };

    return processedHint;
};

/**
 * Get the hints for a category and set a mark for
 * multi-hints index files.
 */
const processCategoryHints = (hints) => {
    const singleHints = hints.filter((hint) => {
        return !hint.name.includes('/');
    });

    /*
     * Hints with id: package-name/hint-name will be
     * considered part of a package with multiple hints
     */
    const multiHints = hints.filter((hint) => {
        return hint.name.includes('/');
    });

    /*
     * Group hints by package name.
     */
    const packagesName = _.groupBy(multiHints, (hint) => {
        return hint.name.split('/')[0];
    });

    const processedHints = _.map(singleHints, processHint);

    const multiHintsProcessed = _.reduce(packagesName, (multi, hintsInMulti, key) => {
        // Add an item with the link to the package with multiple hints itself.
        const partial = processHint({
            friendlyName: _.startCase(key),
            name: key
        }, true);

        multi.push(partial);

        // Add an item for each individual hint for a package with multiple hints.
        return multi.concat(_.map(hintsInMulti, processHint));
    }, []);

    return processedHints.concat(multiHintsProcessed);
};

/**
 * This will add as many file objects to files as categories
 * we have for the hints.
 * Also, this will create a file categores.json that will
 * be use to build the index page for the HINTS section and
 * an index page for each category.
 */
const createHintCategories = (files) => {
    const hintFiles = files.filter((file) => {
        return file.resourceType === 'hint';
    });

    const categories = hintFiles.reduce((acc, file) => {
        const category = file.category;
        const hintName = file.name;

        if (!category) {
            return acc;
        }

        if (!acc.has(category)) {
            acc.set(category, {
                description: config.categories[category].description,
                hints: [{
                    friendlyName: file.frontMatter.title,
                    name: hintName
                }],
                link: `/docs/user-guide/hints/${category}/`,
                name: config.categories[category].name,
                normalizedName: category
            });
        } else {
            acc.get(category).hints.push({
                friendlyName: file.frontMatter.title,
                name: hintName
            });
        }

        return acc;
    }, new Map());

    categories.forEach((category) => {
        category.hints = processCategoryHints(category.hints);

        const basename = `${category.link}index`;

        files.push({
            content: `# ${category.name}${os.EOL}`,
            dest: `${constants.dirs.HINTS_DOC}/${category.name}/index.md`,
            frontMatter: {
                contentType: 'hints-category',
                description: category.description,
                layout: 'docs',
                originalFile: `${basename}.md`,
                permalink: `${basename}.html`,
                section: 'user-guide',
                title: category.name,
                tocTitle: 'hints'
            },
            resourceType: 'hint',
            type: types.doc
        });
    });

    // Add categories.json.
    files.push({
        content: JSON.stringify({ categories: [...categories.values()] }, null, 4),
        dest: `${constants.dirs.DATA}/categories.json`,
        type: types.doc
    });

    return files;
};

const updateChangelog = async () => {
    const files = await globby([`${constants.dirs.NODE_MODULES}/{hint,@hint/{${resources.join(',')},configuration-all/node_modules/@hint/{${resources.join(',')}}}-*}/CHANGELOG.md`]);

    const changelog = await files.reduce(async (totalPromise, file) => {
        const total = await totalPromise;
        const content = await readFile(file, 'utf8');
        let packageName = file.split('/').slice(-2, -1)[0];

        if (packageName !== 'hint') {
            packageName = `@hint/${packageName}`;
        }

        if (!content) {
            return total;
        }

        const parsedChangelog = md2json.parse(content);

        _.forEach(parsedChangelog, (details, key) => {
            // Iterate each date.
            const versionAndDateRegex = /([^\s]+)\s+\(([^)]+)\)/;
            const [, version, dateString] = versionAndDateRegex.exec(key);

            let item = total[dateString];

            if (!item) {
                total[dateString] = {
                    date: new Date(dateString),
                    dateString,
                    packages: {}
                };

                item = total[dateString];
            }

            let packageContent = item.packages[packageName];

            if (!packageContent) {
                item.packages[packageName] = {
                    content: null,
                    version
                };

                packageContent = item.packages[packageName];
            }

            packageContent.content = _.map(details, (update, category) => {
                // Iterate each category of update.

                // First release won't have any changes.
                if (!update.raw) {
                    return {
                        category: 'Initial Release',
                        html: marked(update),
                        raw: update
                    };
                }

                // Line breaks in `0.1.0` can't be ignored after being parsed in `md2json`.
                // So `raw` needs to be processed to prevent unexpected line breaks.
                const raw = update.raw.split(new RegExp('-\\n-|([^.])\\n-')).join('');
                const commitRegex = /- \[\[`[a-z0-9]+`\]\(https:\/\/github.com\/webhintio\/hint\/commit\/([a-z0-9]+)\)] - (.*)(?:\r?\n)*/g;
                const associateCommitRegex = / \(see also: \[`#[0-9]+`\]\(https:\/\/github.com\/webhintio\/hint\/issues\/([0-9]+)\)\)/g;

                update.category = category;
                update.html = marked(raw);
                update.details = [];

                // Extract changelog item details.
                let matchArray = commitRegex.exec(raw);

                while (matchArray !== null) {
                    const message = matchArray.pop();
                    const id = matchArray.pop();
                    const associateCommit = associateCommitRegex.exec(message);

                    update.details.push({
                        associateCommitId: associateCommit ? associateCommit.pop() : null,
                        id,
                        message: message.replace(associateCommitRegex, '')
                    });

                    matchArray = commitRegex.exec(raw);
                }

                return update;
            });

            return item;
        });

        return total;
    }, Promise.resolve({}));

    const sortedChangelog = Object.values(changelog).sort((a, b) => {
        return b.date.getTime() - a.date.getTime();
    });

    const stringChangelog = JSON.stringify(sortedChangelog, null, 2);
    const changelogThemePath = path.join(constants.dirs.CONTENT, '_data/changelog.json');

    await writeFile(changelogThemePath, stringChangelog);
};

/** Convert an object to frontmatter string. */
const frontMatterToString = (frontMatterObj) => {
    if (!frontMatterObj) {
        return null;
    }

    const items = _.reduce(frontMatterObj, (result, value, property) => {
        if (!value) {
            return result;
        }

        const updatedResult = `${result}${property}: "${value}"\n`;

        return updatedResult;
    }, '');

    return `${divider}\n${items}${divider}`;
};

/**
 * Create a file Object for each resource except for hint.
 * These files will contain an index document with all the item
 * for that resource.
 */
const createResourcesIndexes = (files) => {
    const groups = _.groupBy(files, 'resourceType');

    _.forEach(groups, (items, key) => {
        /*
         * The index for hints works different and is
         * created with a ejs template.
         */
        if (key === 'undefined' || key === 'hint') {
            return;
        }

        const resource = `${key}s`;
        const title = `${resource[0].toUpperCase()}${resource.substr(1)}`;

        let content = `# ${title}${os.EOL}${os.EOL}`;

        items.forEach((file) => {
            /*
             * Remove the resource type to get the display name.
             * e.g.
             *      connector-chrome -> chrome
             */
            const displayName = file.name.substr(`${key}-`.length);

            content += `* [\`${displayName}\`](./${file.name}.md)${os.EOL}`;
        });

        const baseName = `docs/user-guide/${resource}/index`;

        files.push({
            content,
            dest: `${constants.dirs.USER_GUIDE}/${resource}/index.md`,
            // These items doesn't have a tocTitle, to avoid see them in the ToC.
            frontMatter: {
                contentType: 'resource-index',
                layout: 'docs',
                originalFile: `${baseName}.md`,
                permalink: `${baseName}.html`,
                section: 'user-guide',
                title
            },
            resourceType: key,
            type: types.doc
        });
    });
};

/**
 * Takes all the file objects and copy/create the files
 * in the destination.
 * * If a file is not type doc, it will be copy directly to file.dest.
 * * If a file is type doc, it will be created in file.dest, joining the content
 *   of the frontMatter and the documentation.
 */
const build = (files) => {
    const promises = files.map(async (file) => {
        try {
            shell.mkdir('-p', path.dirname(file.dest));

            if (file.type === types.other) {
                return copy(file.orig, file.dest);
            }

            const frontMatterString = frontMatterToString(file.frontMatter);

            await writeFile(file.dest, `${frontMatterString ? `${frontMatterString}\n` : ''}${file.content}`, { encoding: 'utf-8' });
        } catch (e) {
            console.log(file);
        }
    });

    return Promise.all(promises);
};

/*
 * When we use our own highlight methods, hexojs
 * can fail if we have any {{ }}
 * this will be avoid the error.
 * Anyways, we need to try to avoid {{ }} in the
 * documentation.
 */
const escapeNunjucks = (files) => {
    files.forEach((file) => {
        if (file.content) {
            file.content = file.content.replace(/{{.*?}}/g, (text) => {
                return `{% raw %}${text}{% endraw %}`;
            });
        }
    });
};

module.exports = {
    build,
    createHintCategories,
    createResourcesIndexes,
    escapeNunjucks,
    getFiles,
    getFilesInfo,
    updateChangelog,
    updateLinks
};
