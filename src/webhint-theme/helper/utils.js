const pagination = require('./pagination');

const isIndexPage = (page) => {
    return page.source.endsWith('index.md');
};

const isGuideIndexPage = (page) => {
    return isIndexPage(page) && page.title.toLowerCase().replace(' ', '-') === page.section;
};

const isSectionIndexPage = (page) => {
    return isIndexPage(page) && page.title.toLowerCase().replace(' ', '-') !== page.section;
};

const isGoodToToC = (page) => {
    return !isGuideIndexPage(page) &&
        page.tocTitle &&
        page.contentType !== 'hints-category' &&
        page.contentType !== 'hints-index' &&
        page.isMultiHints !== 'true' &&
        page.title !== 'webhint';
};

/**
 * Sort pages alphabetically given a `title` unless the file is `summary.md`
 * in which case it will be the first
 * one.
 * E.g.:
 * Server configurations:
 *  - Examples of server configurations (`summary.md`)
 *  - Basic server configuration for Apache (`apache.md`)
 *  - Basic `web.config` for IIS (`iis.md`)
 */
const sortPages = (l, r) => {
    if (l.originalFile.endsWith('/summary.md')) {
        return -1;
    }

    if (r.originalFile.endsWith(`/summary.md`)) {
        return 1;
    }

    if (l.title.toLowerCase() > r.title.toLowerCase()) {
        return 1;
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
    getPagesBySection: (pages, section) => {
        return pages.filter((page) => {
            return page.section === section;
        });
    },
    /**
     * Return the `href` value to link to the target page from the current one.
     * for example when the current page is `hint-amp-validator`:
     * page = { section: 'user-guide', permalink: 'docs/user-guide/hints/hint-amp-validator/index.html' }
     * getTargetPagePath(page, 'docs') => '../../../'
     * getTargetPagePath(page, 'section') => '../../'
     */
    getTargetPagePath: (page, target) => {
        const { section, permalink } = page;
        const parts = permalink.split('/');
        const targetPage = target === 'section' ? section : target;
        let count = parts.length - parts.indexOf(targetPage) - 2;
        let finalPath = '';

        while (count) {
            finalPath += '../';
            count--;
        }

        return finalPath;
    },
    /**
     * Get the ToC items from a list of pages and sort the elements.
     */
    getToCItems: (pages) => {
        const items = pages.reduce((acc, page) => {
            const tocSectionTitle = page.tocTitle;

            if (tocSectionTitle && !acc[tocSectionTitle]) {
                acc[tocSectionTitle] = [];
            }

            // non-guide-index pages and non-multi-hint pages
            if (isGoodToToC(page)) {
                acc[tocSectionTitle].push(page);
            }

            return acc;
        }, {});

        const sortedKeys = Object.keys(items).sort();
        const result = sortedKeys.map((key) => {
            return {
                pages: items[key].sort(sortPages),
                title: key
            };
        });

        return result;
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
        const guideIndexes = ['contributor guide', 'get started using webhint'];

        return page.contentType === 'details' || guideIndexes.includes(page.title.toLowerCase()) || page.contentType === 'resource-index';
    }
};
