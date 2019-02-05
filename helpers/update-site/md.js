const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const _ = require('lodash');
const json2yaml = require('json2yaml');
const marked = require('marked');
const md2json = require('md-2-json');
const normalize = require('normalize-path');
const yamlLoader = require('js-yaml');
const stripMarkdown = require('remove-markdown');

const constants = require('./constants');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const configDir = path.resolve(__dirname, '..', '..', '_config.yml');
const config = yamlLoader.safeLoad(fs.readFileSync(configDir, 'utf8')); // eslint-disable-line no-sync
const divider = '---';

// Make sure the options used here are the same as used in `hexo`.
marked.setOptions(config.marked);

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
        title = _.trim(titleMatch[1].replace(/\(.*\)/, ''));
    }

    return title;
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

    const processedDescription = descriptionMatch[1].replace(/\r?\n/g, '').replace(/(["])/g, '\\$1');

    // Line breaks need to be removed first so that `stripMarkdown` works properly.
    // Double quotes need to be escaped so that `hexo` works properly.
    return stripMarkdown(processedDescription);
};

const trimAndUnquote = (string) => {
    return string.trim().replace(/^"|"$/, '');
};

/** Convert frontmatter string to object. */
const toObject = (frontMatter) => {
    const frontmatterObject = {};
    const frontMatterItemRegex = /(.*):\s*"?(.*)"?/g; // `property: "value"` or `property: value`.
    let match = frontMatterItemRegex.exec(frontMatter);

    while (match !== null) {
        frontmatterObject[match[1]] = trimAndUnquote(match[2]);
        match = frontMatterItemRegex.exec(frontMatter);
    }

    return frontmatterObject;
};

/** Changes the layout of a page if it needs a custom one.  */
const getLayout = (filePath) => {
    const validLayouts = ['changelog', 'docs', '404', 'about'];

    const current = validLayouts.find((template) => {
        return filePath.toLowerCase().includes(template);
    });

    return current;
};

/** Convert an object to frontmatter string. */
const frontMatterToString = (frontMatterObj) => {
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
 * Return the content type for a md file.
 * * hints-category: It is a file with an index of hints for a category.
 * * hints-index: It is a file with the index of categories for all the hints.
 * * index: It is an index file.
 * * details: It is a document file.
 * @param {string} originalFile - Original path for the file.
 * @param {boolean} isHintsCategory - Indicate if the file contains a hints category.
 */
const getContentType = (originalFile, isHintsCategory) => {
    if (isHintsCategory) {
        return 'hints-category';
    }

    if (originalFile.endsWith('/hints/index.md')) {
        return 'hints-index';
    }

    return originalFile.endsWith('/index.md') ? 'index' : 'details';
};

const generateFrontMatterInfo = (filePath, content, currentFrontMatter) => {
    const existingFrontMatter = toObject(currentFrontMatter);
    let relativePath = path.relative(constants.dirs.CONTENT, filePath);
    let root = '';
    let baseName;

    if (_.startsWith(relativePath, 'docs')) {
        relativePath = path.relative('docs', relativePath);
        root = 'docs';
    }

    baseName = path.basename(relativePath, '.md');
    baseName = baseName !== 'index' ? baseName : '';

    const splittedPath = path.dirname(relativePath).split(path.sep);
    const section = splittedPath[0];
    const tocTitle = splittedPath[1];
    let isHintsCategory = false;
    let isMultiHints = false;

    /**
     * Check if the current document is a "Hint Category" or
     * a "Multi-hint".
     * splittedPath for multi-hints will have this shape:
     *      ['user-guide', 'hints', 'hint-xxxxxx']
     * splittedPath for hint category will have this shape:
     *      ['user-guide', 'hints', 'Category']
     */
    if (splittedPath.length > 2) {
        if (splittedPath[2].startsWith('hint-')) {
            isMultiHints = true;
        } else {
            isHintsCategory = true;
        }
    }

    const originalFile = normalize(path.join(root, relativePath)).toLowerCase();
    const newFrontMatter = {
        contentType: getContentType(originalFile, isHintsCategory),
        description: getPredefinedDescription(filePath) || getDescription(content),
        isMultiHints,
        // Define witch ejs layout is going to be used for Hexo.
        layout: getLayout(filePath),
        originalFile,
        permalink: normalize(path.join(root, path.dirname(relativePath), baseName, 'index.html')).toLowerCase(),
        /**
         * Main section in the website.
         * Values can be 'about', 'contributor-guide' or 'user-guide'
         */
        section,
        title: getTitle(content),
        tocTitle: tocTitle ? tocTitle.replace(/-/g, ' ') : tocTitle
    };

    const finalFrontMatterData = _.assign(newFrontMatter, existingFrontMatter);
    // Override frontmatter if there are existing frontmatter values.

    return frontMatterToString(finalFrontMatterData);
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

const addFrontMatter = async (docFiles) => {
    const promises = docFiles.map(async (docFile) => {
        let content;
        let currentFrontMatter;
        const data = await readFile(docFile, 'utf8');
        // Match divider between line breaks.
        const frontMatterRegex = new RegExp(`\r?\n\s*${divider}\r?\n|^\s*${divider}\r?\n`, 'gi'); // eslint-disable-line no-useless-escape

        if (frontMatterRegex.test(data)) {
            // front matter already exists in this file, will update it
            [, currentFrontMatter, content] = data.split(frontMatterRegex); // ['', '<front matter>', '<Actual content in the markdown file>']
        } else {
            content = data;
        }

        content = content || ''; // Replace `undefined` with empty string.

        const frontMatter = generateFrontMatterInfo(docFile, content, currentFrontMatter);
        const newData = `${frontMatter}\n${content}`;

        await writeFile(docFile, newData);
    });

    await Promise.all(promises);
};

const updateLinks = (docFiles) => {
    const promises = docFiles.map(async (docFile) => {
        let content = await readFile(docFile, 'utf8');

        content = updateMarkdownlinks(content, docFile);

        return writeFile(docFile, content);
    });

    return Promise.all(promises);
};

const updateChangelog = async () => {
    let content = await readFile(`${constants.dirs.ABOUT}/CHANGELOG.md`, 'utf8');
    const frontMatterRegex = new RegExp(`\r?\n\s*---\r?\n|^\s*---\r?\n`, 'gi'); // eslint-disable-line no-useless-escape

    [, , content] = content.split(frontMatterRegex);

    const parsedChangelog = md2json.parse(content);

    _.forEach(parsedChangelog, (details) => {
        // Iterate each date.
        _.forEach(details, (update) => {
            // Iterate each category of update.

            // First release won't have any changes.
            if (!update.raw) {
                return;
            }

            // Line breaks in `0.1.0` can't be ignored after being parsed in `md2json`.
            // So `raw` needs to be processed to prevent unexpected line breaks.
            const raw = update.raw.split(new RegExp('-\\n-|([^.])\\n-')).join('');
            const commitRegex = /- \[\[`[a-z0-9]+`\]\(https:\/\/github.com\/webhintio\/hint\/commit\/([a-z0-9]+)\)] - (.*)(?:\r?\n)*/g;
            const associateCommitRegex = / \(see also: \[`#[0-9]+`\]\(https:\/\/github.com\/webhintio\/hint\/issues\/([0-9]+)\)\)/g;

            update.html = marked(raw);
            update.details = {}; // Changlog item details including `associatedCommitId` and `message`.

            // Extract changelog item details.
            let matchArray = commitRegex.exec(raw);

            while (matchArray !== null) {
                const message = matchArray.pop();
                const id = matchArray.pop();
                const associateCommit = associateCommitRegex.exec(message);

                update.details[id] = {
                    associateCommitId: associateCommit ? associateCommit.pop() : null,
                    message: message.replace(associateCommitRegex, '')
                };

                matchArray = commitRegex.exec(raw);
            }
        });
    });
    const yaml = json2yaml.stringify(parsedChangelog);
    const changelogThemePath = path.join(constants.dirs.CONTENT, '_data/changelog.yml');

    await writeFile(changelogThemePath, yaml);
};

module.exports = {
    addFrontMatter,
    updateChangelog,
    updateLinks
};
