const klaw = require('klaw');
const _ = require('lodash');
const path = require('path');
const pify = require('pify');

const directory = path.resolve(process.argv[2]); // path to the folder that contains md files
const filePaths = [];

const fs = pify(require('fs'));

console.log('Updater is initiated.');

const generateFrontMatterInfo = (filePath, title) => {
    const relativePath = path.relative(directory, filePath);
    const baseName = path.basename(relativePath, '.md');

    const [category, tocTitle] = path.dirname(relativePath).split(path.sep);
    const permaLink = path.join('docs', path.dirname(relativePath), `${baseName}.html`);

    const categoryFrontMatter = `category: ${category}`;
    const titleFrontMatter = `title: ${title}`;
    const permalinkFrontMatter = `permalink: ${permaLink}`;
    const divider = '---';
    const frontMatter = [categoryFrontMatter, titleFrontMatter, permalinkFrontMatter, divider];

    if (tocTitle) {
        const tocTitleFrontMatter = `toc-title: ${tocTitle}`;

        frontMatter.unshift(tocTitleFrontMatter);
    }

    return frontMatter.join('\n');
};

const addFrontMatter = async (filePath) => {
    let content;
    const data = await fs.readFile(filePath, 'utf8');

    if (data.includes('---')) {
        // front matter already exists in this file, will update it
        [, content] = data.split('---\n');
    } else {
        content = data;
    }

    const title = _.trim(content.match(/# (.*)\n\n/).pop()
                         .replace(/\(.*\)/, ''));

    const frontMatter = generateFrontMatterInfo(filePath, title);

    const newData = `${frontMatter}\n${content}`;

    await fs.writeFile(filePath, newData);
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
        const promises = filePaths.map(addFrontMatter);

        await Promise.all(promises);

        console.log('Front Matter added to each file.');
    });
