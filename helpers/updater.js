const _ = require('lodash');
const pify = require('pify');
const fs = pify(require('fs'));
const klaw = require('klaw');
const path = require('path');
const normalize = require('normalize-path');

const directory = path.resolve(process.argv[2]); // path to the folder that contains md files
const filePaths = [];
const ignoredFiles = ['404.md'];

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
    const permaLink = normalize(path.join(root, path.dirname(relativePath), `${baseName}.html`));

    const categoryFrontMatter = `category: ${_.trim(category, '.') ? category : 'doc-index'}`;
    const permalinkFrontMatter = `permalink: ${permaLink}`;
    const frontMatter = [categoryFrontMatter, permalinkFrontMatter, divider];

    permaLinks.set(baseName, permaLink); // populate permaLinks

    insertFrontMatterItemIfExist('toc-title', tocTitle, frontMatter);
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

    if (data.includes(divider)) {
        // front matter already exists in this file, will update it
        [, , content] = data.split(divider); // ['', '<front matter>', '<Actual content in the markdown file>']
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

// Update local file links to site links
// before: 'see [how to develop a collector](../developer-guide/collectors/how-to-develop-a-collector.md)'
// after:  'see [how to develop a collector](/docs/developer-guide/collectors/how-to-develop-a-collector.html)'
const updateLocalLinks = async (filePath) => {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const localLinksRegex = /\((?!http)([^(|)]+.md)\)/g; // find parenthesis-enclosed content that ends with `.md` and doesn't start with `http`.
    const localLinks = [];
    let match;

    while ((match = localLinksRegex.exec(fileContent)) !== null) {
        localLinks.push(match.pop());
    }

    if (!localLinks.length) {
        return;
    }

    const newFileContent = _.reduce(localLinks, (newContent, localLink) => {
        const siteLink = `/${permaLinks.get(path.basename(localLink, '.md'))}`;

        return newContent.replace(localLink, siteLink);
    }, fileContent);

    await fs.writeFile(filePath, newFileContent);
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

        const updateLocalLinkPromises = filePaths.map(updateLocalLinks);

        await Promise.all(updateLocalLinkPromises);
        console.log('Links updated in each file.');
    });
