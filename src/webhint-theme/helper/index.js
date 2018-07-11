const globby = require('globby');
const path = require('path');

const pagination = require('./pagination');

const basePath = path.join(__dirname, '..');
const files = globby.sync(['helper/*.js', '**/helpers/*.js', '!helper/index.js', '!helper/pagination.js'], { cwd: basePath }); // eslint-disable-line no-sync

const helpers = files.reduce((result, file) => {
    return Object.assign(result, require(path.join(basePath, file)));
}, {});

const url = require('url');

const jobStatus = {
    error: 'error',
    finished: 'finished',
    pending: 'pending',
    started: 'started'
};

const hintStatus = {
    error: 'error',
    pass: 'pass',
    pending: 'pending',
    warning: 'warning'
};

module.exports = function () {
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

    const self = {
        capitalize: (str) => {
            const filtered = str.replace(/[^a-zA-Z0-9]/g, ' ');

            return filtered.charAt(0).toUpperCase() + filtered.slice(1);
        },
        filterErrorsAndWarnings: (results) => {
            if (!results) {
                return results;
            }

            return results.filter((result) => {
                return result.status !== hintStatus.pass;
            });
        },
        getAboutItems: (navs) => {
            // `navs` is the menu data saved in `menu.yml`.
            return navs[2].items;
        },
        getDocumentItems: (navs) => {
            // `navs` is the menu data saved in `menu.yml`.
            return navs[1].items;
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
        getPagesByToCTitle: (title, pages) => {
            return pages[title].filter((page) => {
                return page.contentType === 'details';
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
        getToCIndexPageLink: (pages) => {
            return pages[0].permalink;
        },
        hasSubPage: function (id, options) { // eslint-disable-line object-shorthand
            const result = (id === 'docs' || id === 'about');

            if (result) {
                return options.fn(this);
            }

            return options.inverse(this);
        },
        isActiveItem: (page, target) => {
            return (page.tocTitle === target) && (page.contentType === 'details');
        },
        isError: (status) => {
            return status === jobStatus.error;
        },
        isFinish: (status) => {
            return [jobStatus.finished, jobStatus.error].includes(status);
        },
        isNotGuideIndexPage: (page) => {
            // returns whether or not a page is a subpage under contributor guide or user-guide
            return !isGuideIndexPage(page);
        },
        isNotSectionIndexPage: (page) => {
            return !isSectionIndexPage(page);
        },
        isPass: (status, stats) => {
            const passStats = (stats.errors === 0) && (stats.warnings === 0);

            return (status !== jobStatus.error) && passStats;
        },
        isPending: (status) => {
            return status === jobStatus.pending;
        },
        noIssue: (category) => {
            return category.hints.every((hint) => {
                return hint.status === hintStatus.pass;
            });
        },
        noPending: (category) => {
            return category.hints.every((hint) => {
                return hint.status !== hintStatus.pending;
            });
        },
        normalizeClassName: (value) => {
            const className = value.split('/').shift();

            return className.toLowerCase().trim()
                .replace(/[^a-z0-9]/gi, '-');
        },
        or: (l, r) => {
            return l || r;
        },
        pagination: pagination.generate,
        passErrors: (statistics) => {
            return statistics && statistics.errors === 0;
        },
        passHint: (statistics) => {
            return statistics && (statistics.errors === 0 && statistics.warnings === 0);
        },
        passWarnings: (statistics) => {
            return statistics && statistics.warnings === 0;
        },
        sanitize: (permalink) => {
            return permalink.replace(/\/index.html/g, '/');
        },
        setDefault: (...values) => {
            return values.reduce((accumulator, value) => {
                return accumulator || value;
            });
        },
        showMdContent: (page) => {
            // If the markdown Content should be used.
            const guildeIndexes = ['contributor guide', 'user guide'];

            return page.contentType === 'details' || guildeIndexes.includes(page.title.toLowerCase());
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
        },
        toString: (obj) => {
            if (obj) {
                return obj.toString().replace(/self./g, 'Handlebars.helpers.');
            }

            return '';
        }
    };

    return Object.assign(self, helpers);
};
