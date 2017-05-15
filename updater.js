const _ = require('lodash');
const pify = require('pify');
const fs = pify(require('fs'));
const klaw = require('klaw');
const path = require('path');
const util = require('hexo-util');

const directory = path.resolve(process.argv[2]); // path to the folder that contains md files
const filePaths = [];

const permaLinks = new Map(); // a collection of permalinks
const divider = '---';

console.log('Updater is initiated.');

const generateFrontMatterInfo = (filePath, title) => {
    const relativePath = path.relative(directory, filePath);
    const baseName = path.basename(relativePath, '.md');

    const [category, tocTitle] = path.dirname(relativePath).split(path.sep);
    const permaLink = path.join('docs', path.dirname(relativePath), `${baseName}.html`);

    const categoryFrontMatter = `category: ${category}`;
    const titleFrontMatter = `title: ${title}`;
    const permalinkFrontMatter = `permalink: ${permaLink}`;
    const frontMatter = [categoryFrontMatter, titleFrontMatter, permalinkFrontMatter, divider];

    permaLinks.set(baseName, permaLink); // populate permaLinks

    if (tocTitle) {
        const tocTitleFrontMatter = `toc-title: ${tocTitle}`;

        frontMatter.unshift(tocTitleFrontMatter);
    }

    frontMatter.unshift(divider);

    return frontMatter.join('\n');
};

const escape = (html, encode) => {
    return html
        .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

// Update fragment identifiers to make links work in Hexo-generated pages
const updateAnchors = (content) => {
    // find all anchors containing links, example: '* [`scan::start`](#scanstart)\r\n'
    const anchors = content.match(/\* \[`(.*)::(.*)`\]\(#(.*)\)(\n|\r\n)/g);

    if (!anchors) {
        return content;
    }

    // update anchor link format in markdown files
    return _.reduce(anchors, (newContent, anchor) => { // example for an anchor: '* [`element::<element-type>`](#elementelement-type)'
        const header = anchor.match(/\* \[`(.*)`\]/).pop(); // 'element::<element-type>'
        const identifier = util.slugize(escape(header.trim())); // 'element-lt-element-type-gt'
        const newAnchor = `* [\`${header}\`](#${identifier})\n`; // '* [`element::<element-type>`](#element-lt-element-type-gt)'

        return newContent.replace(anchor, newAnchor);
    }, content);
};

const addFrontMatter = async (filePath) => {
    let content;
    const data = await fs.readFile(filePath, 'utf8');

    if (data.includes(divider)) {
        // front matter already exists in this file, will update it
        [, content] = data.split(divider);
    } else {
        content = `\n${data}`;
    }

    // extract the first title in markdown file and remove the abbreviation in parenthesis
    // example: '\r\n# Disallow certain HTTP headers (`disallow-headers`)\r\n\r\n' => 'Disallow certain HTTP headers'
    const title = _.trim(content.match(/# (.*)(\n\n|\r\n\r\n)/)[1]
        .replace(/\(.*\)/, ''));

    const frontMatter = generateFrontMatterInfo(filePath, title);

    content = updateAnchors(content);

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

// Iterate all the files in the dest folder and add frontmatter to each file
klaw(directory)
    .on('data', (item) => {
        if (_.endsWith(item.path, '.md')) {
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
