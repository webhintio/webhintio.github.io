const pagination = require('./pagination');
const url = require('url');

module.exports = function () {
    const isIndexPage = (page) => {
        return page.permalink.endsWith('index.html');
    };

    const isGuideIndexPage = (page) => {
        return isIndexPage(page) && page.title.toLowerCase().replace(' ', '-') === page.category;
    };

    const isSectionIndexPage = (page) => {
        return isIndexPage(page) && page.title.toLowerCase().replace(' ', '-') !== page.category;
    };

    const normalizeString = (str) => {
        return str.toLowerCase().replace(/[^a-z0-9]/gi, '-');
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

    return {
        /**
         * Handlebars Comparison Helpers
         * Copyright (c) 2013 Jon Schlinkert, Brian Woodward, contributors
         * Licensed under the MIT License (MIT).
         * https://github.com/helpers/handlebars-helpers/blob/a3683bab5519882927de527077c34a98ac22067b/lib/comparison.js#L48
         * Modified to fit Sonar Website
         */
        /**
         * {{#compare}}...{{/compare}}
         *
         * @credit: OOCSS
         * @param left value
         * @param operator The operator, must be between quotes ">", "=", "<=", etc...
         * @param right value
         * @param options option object sent by handlebars
         * @return {String} formatted html
         *
         * @example:
         *   {{#compare unicorns "<" ponies}}
         *     I knew it, unicorns are just low-quality ponies!
         *   {{/compare}}
         *
         *   {{#compare value ">=" 10}}
         *     The value is greater or equal than 10
         *     {{else}}
         *     The value is lower than 10
         *   {{/compare}}
         */
        compare: function (left, operator, right, options) { // eslint-disable-line object-shorthand
            if (arguments.length < 3) {
                throw new Error('Handlebars Helper "compare" needs 2 parameters');
            }

            /* eslint-disable no-param-reassign */
            if (!options) {
                options = right;
                right = operator;
                operator = '===';
            }
            /* eslint-enable no-param-reassign */

            const operators = {
                '!=': (l, r) => {
                    return l !== r;
                },
                '!==': (l, r) => {
                    return l !== r;
                },
                '<': (l, r) => {
                    return l < r;
                },
                '<=': (l, r) => {
                    return l <= r;
                },
                '==': (l, r) => {
                    return l === r;
                },
                '===': (l, r) => {
                    if (typeof l === 'string' && typeof r === 'string') {
                        /* eslint-disable no-param-reassign */
                        l = normalizeString(l);
                        r = normalizeString(r);
                        /* eslint-enable no-param-reassign */
                    }

                    return l === r;
                },
                '>': (l, r) => {
                    return l > r;
                },
                '>=': (l, r) => {
                    return l >= r;
                },
                belongsTo: (l, r) => {
                    const normalizedL = l ? normalizeString(l) : l;
                    const normalizedR = r.split(', ').map((element) => {
                        return normalizeString(element);
                    });

                    return normalizedR.includes(normalizedL);
                },
                typeof: (l, r) => {
                    return typeof l === r;
                },
                '||': (l, r) => {
                    return l || r;
                }
            };

            if (!operators[operator]) {
                throw new Error(`Handlebars Helper "compare" doesn't know the operator ${operator}`);
            }

            const result = operators[operator](left, right);

            if (result) {
                return options.fn(this);
            }

            return options.inverse(this);
        },
        getAboutItems: (navs) => {
            // `navs` is the menu data saved in `menu.yml`.
            return navs[2].items;
        },
        getDocumentItems: (navs) => {
            // `navs` is the menu data saved in `menu.yml`.
            return navs[1].items;
        },
        getMarkdownLink: (link) => {
            return link.replace(/\.html$/, '.md');
        },
        getPagesByToCTitle: (title, pages) => {
            return pages[title];
        },
        getSignalIssueQuery: (root, title, directory) => {
            const issueTitle = `[docs] Issue with '${title}'`;
            const issueContent = url.resolve(root, directory);

            return `title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueContent)}`;
        },
        getSortedToCTitles: (pages) => {
            return Object.keys(pages).sort();
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
        isNotGuideIndexPage: (page) => {
            // returns whether or not a page is a subpage under developer guide or user-guide
            return !isGuideIndexPage(page);
        },
        normalizeClassName: (value) => {
            const className = value.split('/').shift();

            return className.toLowerCase().trim()
                .replace(/[^a-z0-9]/gi, '-');
        },
        pagination: pagination.generate,
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
};
