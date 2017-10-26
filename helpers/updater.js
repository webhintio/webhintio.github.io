const _ = require('lodash');
const pify = require('pify');
const fs = pify(require('fs'));
const json2yaml = require('json2yaml');
const klaw = require('klaw');
const path = require('path');
const marked = require('marked');
const md2json = require('md-2-json');
const normalize = require('normalize-path');
const stripMarkdown = require('remove-markdown');
const yamlLoader = require('js-yaml');

const directory = path.resolve(process.argv[2]); // path to the folder that contains md files
const configDir = path.resolve(directory, '..', '..', '..', '_config.yml');
const filePaths = [];
const ignoredFiles = ['404.md', 'about.md', 'contributors.md', 'docs/index.md'];
const config = yamlLoader.safeLoad(fs.readFileSync(configDir, 'utf8')); // eslint-disable-line no-sync
const divider = '---';

console.log('Updater is initiated.');

// Make sure the options used here are the same as used in `hexo`.
marked.setOptions(config.marked);

const isIgnoredFile = (filePath) => {
    return _.includes(ignoredFiles, (ignoredFile) => {
        const file = ignoredFile.includes('/') ? filePath : path.basename(filePath);

        return file.includes(path.join(ignoredFile, ''));
    });
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

/** Gets the description of a rule by extracting the first section before "Why is this important" */
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

/** Changes the layout of a page if it needs a custom one.  */
const getLayout = (filePath) => {
    const validLayouts = ['changelog', 'docs', '404', 'about'];

    const current = validLayouts.find((template) => {
        return filePath.toLowerCase().includes(template);
    });

    return current;
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

/** Convert an object to frontmatter string. */
const toString = (frontMatterObj) => {
    const items = _.reduce(frontMatterObj, (result, value, property) => {
        if (!value) {
            return result;
        }

        const updatedResult = `${result}${property}: "${value}"\n`;

        return updatedResult;
    }, '');

    return `${divider}\n${items}${divider}`;
};

const generateFrontMatterInfo = (filePath, title, description, currentFrontMatter) => {
    const existingFrontMatter = toObject(currentFrontMatter);
    let relativePath = path.relative(directory, filePath);
    let root = '';
    let baseName;

    if (_.startsWith(relativePath, 'docs')) {
        relativePath = path.relative('docs', relativePath);
        root = 'docs';
    }

    baseName = path.basename(relativePath, '.md');
    baseName = baseName !== 'index' ? baseName : '';

    const [category, tocTitle] = path.dirname(relativePath).split(path.sep);
    const permalink = normalize(path.join(root, path.dirname(relativePath), baseName, 'index.html')).toLowerCase();
    const layout = getLayout(filePath);

    const newFrontMatter = {
        category: _.trim(category, '.') ? category : 'doc-index',
        description,
        layout,
        permalink,
        title,
        tocTitle
    };

    const finalFrontMatterData = _.assign(newFrontMatter, existingFrontMatter);
    // Override frontmatter if there are existing frontmatter values.

    return toString(finalFrontMatterData);
};

const getTitle = (content) => {
    // extract the first title in markdown file and remove the abbreviation in parenthesis
    // example: '\r\n# Disallow certain HTTP headers (`disallow-headers`)\r\n\r\n' => 'Disallow certain HTTP headers'
    const titleMatch = content.match(/# (.*)(\n|\r\n)/);
    let title;

    if (titleMatch) {
        title = _.trim(titleMatch[1].replace(/\(.*\)/, ''));
    }

    return title;
};

const updateChangelog = async (content) => {
    const parsedChangelog = md2json.parse(content);

    _.forEach(parsedChangelog, (details) => {
        // Iterate each date.
        _.forEach(details, (update) => {
            // Iterate each category of update.

            // Line breaks in `0.1.0` can't be ignored after being parsed in `md2json`.
            // So `raw` needs to be processed to prevent unexpected line breaks.
            const raw = update.raw.split(new RegExp('-\\n-|([^.])\\n-')).join('');
            const commitRegex = /- \[\[`[a-z0-9]+`\]\(https:\/\/github.com\/sonarwhal\/sonar\/commit\/([a-z0-9]+)\)] - (.*)(?:\r?\n)*/g;
            const associateCommitRegex = / \(see also: \[`#[0-9]+`\]\(https:\/\/github.com\/sonarwhal\/sonar\/issues\/([0-9]+)\)\)/g;

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
    const changelogThemePath = path.join(directory, '_data/changelog.yml');

    await fs.writeFile(changelogThemePath, yaml);
};

const addFrontMatter = async (filePath) => {
    let content;
    let currentFrontMatter;
    const data = await fs.readFile(filePath, 'utf8');
    // Match divider between line breaks.
    const frontMatterRegex = new RegExp(`\r?\n\s*---\r?\n|^\s*---\r?\n`, 'gi'); // eslint-disable-line no-useless-escape

    if (frontMatterRegex.test(data)) {
        // front matter already exists in this file, will update it
        [, currentFrontMatter, content] = data.split(frontMatterRegex); // ['', '<front matter>', '<Actual content in the markdown file>']
    } else {
        content = data;
    }

    content = content || ''; // Replace `undefined` with empty string.
    const title = getTitle(content);
    const description = getPredefinedDescription(filePath) || getDescription(content);

    const frontMatter = generateFrontMatterInfo(filePath, title, description, currentFrontMatter);
    const newData = `${frontMatter}\n${content}`;

    await fs.writeFile(filePath, newData);

    // Generate yaml file containing changelog data.
    if (!filePath.toLowerCase().includes('changelog.md')) {
        return;
    }

    await updateChangelog(content);
};

// Iterate all the markdown files and add frontmatter to each file
klaw(directory)
    .on('data', (item) => {
        if (_.endsWith(item.path, '.md') && !isIgnoredFile(item.path)) {
            filePaths.push(item.path);
        }
    })
    .on('error', (err, item) => {
        console.log(err.message, item.path);
    })
    .on('end', async () => {
        const addFrontMatterPromises = filePaths.map(addFrontMatter);

        await Promise.all(addFrontMatterPromises);
        console.log('Front Matter added to each file.');
    });
