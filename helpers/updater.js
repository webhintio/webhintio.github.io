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
const ignoredFiles = ['404.md', 'about.md', 'contributors.md'];
const config = yamlLoader.safeLoad(fs.readFileSync(configDir, 'utf8')); // eslint-disable-line no-sync
const divider = '---';

console.log('Updater is initiated.');

// Make sure the options used here are the same as used in `hexo`.
marked.setOptions(config.marked);

const isIgnoredFile = (filePath) => {
    const file = path.basename(filePath);

    return _.includes(ignoredFiles, file);
};
const insertFrontMatterItemIfExist = (itemName, itemValue, frontmatter) => {
    if (itemValue) {
        const tocTitleFrontMatter = `${itemName}: "${itemValue}"`;

        frontmatter.unshift(tocTitleFrontMatter);
    }
};

const getDescription = (content) => {
    const descriptionRegex = /## Why is this important\?([\s\S]*?)##/;
    // Extract the content between `## Why is this important?` and the next h2 title.
    const descriptionMatch = content.match(descriptionRegex);

    if (!descriptionMatch || !descriptionMatch[1]) {
        return '';
    }

    const processedDescription = descriptionMatch[1].replace(/\r?\n/g, '').replace(/(["])/g, '\\$1');
    // Line breaks need to be removed first so that `stripMarkdown` works properly.
    // Double quotes need to be escaped so that `hexo` works properly.

    return stripMarkdown(processedDescription);
};

const getLayout = (filePath) => {
    const validLayouts = ['changelog', 'docs', '404', 'about'];

    const current = validLayouts.find((template) => {
        return filePath.toLowerCase().includes(template);
    });

    return current;
};

const generateFrontMatterInfo = (filePath, title, description, currentFrontMatter) => {
    const currentFrontMatterArray = currentFrontMatter ? currentFrontMatter.split(/\r?\n/g) : [];
    let relativePath = path.relative(directory, filePath);
    let root = '';
    let index;
    let baseName;

    if (_.startsWith(relativePath, 'docs')) {
        relativePath = path.relative('docs', relativePath);
        root = 'docs';
    }
    baseName = path.basename(relativePath, '.md');
    const indexMatch = baseName.match(/(^\d+)-/);

    if (indexMatch) {
        index = indexMatch.pop();

        baseName = baseName.replace(indexMatch.pop(), '');
    }

    const [category, tocTitle] = path.dirname(relativePath).split(path.sep);
    const permaLink = normalize(path.join(root, path.dirname(relativePath), `${baseName}.html`)).toLowerCase();

    const categoryFrontMatter = `category: "${_.trim(category, '.') ? category : 'doc-index'}"`;
    const permalinkFrontMatter = `permalink: "${permaLink}"`;
    const template = getLayout(filePath);
    let frontMatter = [categoryFrontMatter, permalinkFrontMatter, divider];

    insertFrontMatterItemIfExist('layout', template, frontMatter);
    insertFrontMatterItemIfExist('tocTitle', tocTitle, frontMatter);
    insertFrontMatterItemIfExist('title', title, frontMatter);
    insertFrontMatterItemIfExist('description', description, frontMatter);

    if (index) {
        const indexFrontMatter = `index: ${index}`;

        frontMatter.unshift(indexFrontMatter);
    }

    // Merge new frontMatter with current existing frontMatter.
    frontMatter = _.union(currentFrontMatterArray, frontMatter);
    frontMatter.unshift(divider);

    return frontMatter.join('\n');
};

const addFrontMatter = async (filePath) => {
    let content;
    let currentFrontMatter;
    let title;
    let description;
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

    // extract the first title in markdown file and remove the abbreviation in parenthesis
    // example: '\r\n# Disallow certain HTTP headers (`disallow-headers`)\r\n\r\n' => 'Disallow certain HTTP headers'
    const titleMatch = content.match(/# (.*)(\n|\r\n)/);

    if (titleMatch) {
        title = _.trim(titleMatch[1].replace(/\(.*\)/, ''));
    }

    if (path.dirname(filePath).endsWith('rules')) {
        description = getDescription(content);
    }

    const frontMatter = generateFrontMatterInfo(filePath, title, description, currentFrontMatter);
    const newData = `${frontMatter}\n${content}`;

    await fs.writeFile(filePath, newData);

    // Generate yaml file containing changelog data.
    if (!filePath.toLowerCase().includes('changelog.md')) {
        return;
    }

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
            let matchArray;

            update.html = marked(raw);
            update.details = {}; // Changlog item details including `associatedCommitId` and `message`.

            // Extract changelog item details.
            while ((matchArray = commitRegex.exec(raw)) !== null) {
                const message = matchArray.pop();
                const id = matchArray.pop();
                const associateCommit = associateCommitRegex.exec(message);

                update.details[id] = {
                    associateCommitId: associateCommit ? associateCommit.pop() : null,
                    message: message.replace(associateCommitRegex, '')
                };
            }
        });
    });
    const yaml = json2yaml.stringify(parsedChangelog);
    const changelogThemePath = path.join(directory, '_data/changelog.yml');

    await fs.writeFile(changelogThemePath, yaml);
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
