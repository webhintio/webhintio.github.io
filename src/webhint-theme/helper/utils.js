const pagination = require('./pagination');

const url = require('url');

const isIndexPage = (page) => {
    return page.source.endsWith('index.md');
};

const isGuideIndexPage = (page) => {
    return isIndexPage(page) && page.title.toLowerCase().replace(' ', '-') === page.category;
};

const isSectionIndexPage = (page) => {
    return isIndexPage(page) && page.title.toLowerCase().replace(' ', '-') !== page.category;
};

const sortPageByAlpha = (l, r) => {
    if (l.title > r.title) {
        return 1;
    }

    return -1;
};

const sortPageByIndex = (l, r) => {
    const indexL = l.index;
    const indexR = r.index;

    if (isSectionIndexPage(l)) {
        return -1;
    }

    if (isSectionIndexPage(r)) {
        return 1;
    }

    // Check if one of the pages is the index page before proceeding to index comparison
    // If index page checking is combined with index comparison, the following edge case will return -1 instead of 1:
    // - indexL:01
    // - indexR: undefined; isSectionIndexPage(r) = true

    if ((indexL && !indexR) || indexL < indexR) {
        return -1;
    }

    if ((!indexL && indexR) || indexL > indexR) {
        return 1;
    }

    if ((!indexL && !indexR) || (indexL === indexR)) {
        return sortPageByAlpha(l, r);
    }

    return -1;
};

module.exports = {
    capitalize: (str) => {
        const filtered = str.replace(/[^a-zA-Z0-9]/g, ' ');

        return filtered.charAt(0).toUpperCase() + filtered.slice(1);
    },
    getEditLink: (originalFile) => {
        const hintRegex = /.*\/hints\/(hint-.+)\.md/ig;
        const match = hintRegex.exec(originalFile);

        if (match) {
            const hintName = match.pop();

            return `packages/${hintName}/README.md`;
        }

        return `packages/hint/${originalFile}`;
    },
    getHintsCount: (hints) => {
        return hints.filter((hint) => {
            return !hint.isSummary;
        }).length;
    },
    /**
     * Returns all the pages under a given `title` sorted alphabetically
     * unless the file is `summary.md` in which case it will be the first
     * one.
     * E.g.:
     * Server configurations:
     *  - Examples of server configurations (`summary.md`)
     *  - Basic server configuration for Apache (`apache.md`)
     *  - Basic `web.config` for IIS (`iis.md`)
     */
    getPagesByToCTitle: (title, pages) => {
        return pages[title].filter((page) => {
            return page.contentType === 'details';
        }).sort((a, b) => {
            if (a.originalFile.endsWith('summary.md')) {
                return -1;
            }

            if (b.originalFile.endsWith(`summary.md`)) {
                return 1;
            }

            return a.title > b.title;
        });
    },
    getSignalIssueQuery: (root, title, directory) => {
        const issueTitle = `[docs] Issue with '${title}'`;
        const issueContent = url.resolve(root, directory);

        return `title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueContent)}`;
    },
    getSortedToCTitles: (pages) => {
        return Object.keys(pages).sort();
    },
    /**
     * Return the `href` value to link to the target page from the current one.
     * for example when the current page is `hint-amp-validator`:
     * page = { category: 'user-guide', permalink: 'docs/user-guide/hints/hint-amp-validator/index.html' }
     * getTargetPagePath(page, 'docs') => '../../../'
     * getTargetPagePath(page, 'category') => '../../'
     */
    getTargetPagePath: (page, target) => {
        const { category, permalink } = page;
        const parts = permalink.split('/');
        const targetPage = target === 'category' ? category : target;
        let count = parts.length - parts.indexOf(targetPage) - 2;
        let finalPath = '';

        while (count) {
            finalPath += '../';
            count--;
        }

        return finalPath;
    },
    hasSubPage: function (id) { // eslint-disable-line object-shorthand
        return (id === 'docs' || id === 'about');
    },
    isActiveItem: (page, target) => {
        return (page.tocTitle === target) && (page.contentType === 'details');
    },
    isGuideIndexPage,
    isSectionIndexPage,
    normalizeClassName: (value) => {
        const className = value.split('/').shift();

        return className.toLowerCase().trim()
            .replace(/[^a-z0-9]/gi, '-');
    },
    pagination: pagination.generate,
    sanitize: (permalink) => {
        return permalink.replace(/\/index.html/g, '/');
    },
    showMdContent: (page) => {
        // If the markdown Content should be used.
        const guildeIndexes = ['contributor guide', 'user guide'];

        return page.contentType === 'details' || guildeIndexes.includes(page.title.toLowerCase()) || (page.contentType === 'index' && page.tocTitle !== 'hints');
    },
    // Sort out `Developer guide` or `User guide` pages
    sortPagesByCategory: (allPages, category) => {
        const pages = allPages.reduce((acc, page) => {
            if (page.category === category) {
                const tocSectionTitle = page.tocTitle;

                if (tocSectionTitle && !acc[tocSectionTitle]) {
                    acc[tocSectionTitle] = [];
                }

                if (!isGuideIndexPage(page) && page.tocTitle) { // non-guide-index pages
                    acc[tocSectionTitle].push(page);
                }
            }

            return acc;
        }, {});

        // Sort pages numerically first, and then alphabetically
        for (const section in pages) {
            if (pages.hasOwnProperty(section)) {
                pages[section] = pages[section].sort(sortPageByIndex);
            }
        }

        return pages;
    }
};
