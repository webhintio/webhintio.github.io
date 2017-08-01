const _ = require('lodash');
const pify = require('pify');
const fs = pify(require('fs'));
const klaw = require('klaw');
const path = require('path');
const normalize = require('normalize-path');

const directory = path.resolve(process.argv[2]); // path to the folder that contains md files
const filePaths = [];
const ignoredFiles = ['404.md', 'about.md', 'contributors.md'];

const permaLinks = new Map(); // a collection of permalinks
const divider = '---';

console.log('Updater is initiated.');

const isIgnoredFile = (filePath) => {
    const file = path.basename(filePath);

    return _.includes(ignoredFiles, file);
};
const insertFrontMatterItemIfExist = (itemName, itemValue, frontmatter) => {
    if (itemValue) {
        const tocTitleFrontMatter = `${itemName}: ${itemValue}`;

        frontmatter.unshift(tocTitleFrontMatter);
    }
};

const generateFrontMatterInfo = (filePath, title) => {
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

    const categoryFrontMatter = `category: ${_.trim(category, '.') ? category : 'doc-index'}`;
    const permalinkFrontMatter = `permalink: ${permaLink}`;
    const frontMatter = [categoryFrontMatter, permalinkFrontMatter, divider];

    permaLinks.set(baseName, permaLink); // populate permaLinks

    insertFrontMatterItemIfExist('tocTitle', tocTitle, frontMatter);
    insertFrontMatterItemIfExist('title', title, frontMatter);

    if (index) {
        const indexFrontMatter = `index: ${index}`;

        frontMatter.unshift(indexFrontMatter);
    }

    frontMatter.unshift(divider);

    return frontMatter.join('\n');
};

const addFrontMatter = async (filePath) => {
    let content;
    let title;
    const data = await fs.readFile(filePath, 'utf8');
    const frontMatterRegex = new RegExp(`^\s*${divider}`, 'gi'); // eslint-disable-line no-useless-escape

    if (frontMatterRegex.test(data)) {
        // front matter already exists in this file, will update it
        [, , content] = data.split(frontMatterRegex); // ['', '<front matter>', '<Actual content in the markdown file>']
    } else {
        content = `\n${data}`;
    }

    // extract the first title in markdown file and remove the abbreviation in parenthesis
    // example: '\r\n# Disallow certain HTTP headers (`disallow-headers`)\r\n\r\n' => 'Disallow certain HTTP headers'
    const titleMatch = content.match(/# (.*)(\n|\r\n)/);

    if (titleMatch) {
        title = _.trim(titleMatch[1].replace(/\(.*\)/, ''));
    }

    const frontMatter = generateFrontMatterInfo(filePath, title);

    const newData = `${frontMatter}${content}`;

    await fs.writeFile(filePath, newData);
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
