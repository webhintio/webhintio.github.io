/* eslint-disable object-shorthand, prefer-template */
const Handlebars = require('handlebars');
const pagination = require('./pagination');
const url = require('url');

const jobStatus = {
    error: 'error',
    finished: 'finished',
    pending: 'pending',
    started: 'started'
};

const ruleStatus = {
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

    const self = {
        /* eslint-disable object-shorthand */
        capitalize: function (str) {
            const filtered = str.replace(/[^a-zA-Z0-9]/g, ' ');

            return filtered.charAt(0).toUpperCase() + filtered.slice(1);
        },
        /* eslint-enable object-shorthand */
        /**
         * Handlebars Comparison Helpers
         * Copyright (c) 2013 Jon Schlinkert, Brian Woodward, contributors
         * Licensed under the MIT License (MIT).
         * https://github.com/helpers/handlebars-helpers/blob/a3683bab5519882927de527077c34a98ac22067b/lib/comparison.js#L48
         * Modified to fit sonarwhal Website
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
                '!=': function (l, r) {
                    return l !== r;
                },
                '!==': function (l, r) {
                    return l !== r;
                },
                '<': function (l, r) {
                    return l < r;
                },
                '<=': function (l, r) {
                    return l <= r;
                },
                '==': function (l, r) {
                    return l === r;
                },
                '===': function (l, r) {
                    if (typeof l === 'string' && typeof r === 'string') {
                        /* eslint-disable no-param-reassign */
                        l = normalizeString(l);
                        r = normalizeString(r);
                        /* eslint-enable no-param-reassign */
                    }

                    return l === r;
                },
                '>': function (l, r) {
                    return l > r;
                },
                '>=': function (l, r) {
                    return l >= r;
                },
                includes: function (collection, member) {
                    const normalizedR = member ? normalizeString(member) : member;
                    const normalizedL = collection.split(/, */g).map((element) => {
                        return normalizeString(element);
                    });

                    return normalizedL.includes(normalizedR);
                },
                typeof: function (l, r) {
                    return typeof l === r;
                },
                '||': function (l, r) {
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
        cutCodeString: function (codeString) {
            return self.shortenString(codeString, 150);
        },
        cutString: function (string, maxLength) {
            const minLength = 0.8 * maxLength;
            const preferredStopChars = /[^a-zA-Z0-9]/g;
            let chunk;

            for (let i = minLength; i < maxLength; i++) {
                // Start looking for preferred stop characters.
                if (preferredStopChars.test(string[i])) {
                    chunk = string.slice(0, i);

                    break;
                }
            }

            chunk = chunk || string.slice(0, maxLength);

            return chunk;
        },
        cutUrlString: function (urlString) {
            return self.shortenString(urlString, 25);
        },
        filterErrorsAndWarnings: (results) => {
            if (!results) {
                return results;
            }

            return results.filter((result) => {
                return result.status !== ruleStatus.pass;
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
        getLength: function (messages, unit) {
            const length = messages.length;
            const units = self.pluralize(unit, length);

            return length + ' ' + units;
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
        linkify: (msg) => {
            const regex = /(https?:\/\/[a-zA-Z0-9.\\/?:@\-_=#]+\.[a-zA-Z0-9&.\\/?:@-_=#]*)\s[a-zA-Z]/g;
            // Modified use of regular expression in https://stackoverflow.com/a/39220764
            // Should match:
            // jQuery@2.1.4 has 2 known vulnerabilities (1 medium, 1 low). See https://snyk.io/vuln/npm:jquery for more information.
            // AngularJS@1.4.9 has 3 known vulnerabilities (3 high). See https://snyk.io/vuln/npm:angular for more information.
            // Shouldn't match (shortened url):
            // File https://www.odysys.com/ … hedule-Your-Demo-Now.png could be around 37.73kB (78%) smaller.
            const match = regex.exec(msg);

            if (!match) {
                return msg;
            }

            const urlMatch = Handlebars.Utils.escapeExpression(match.pop());
            const newMsg = msg.replace(urlMatch, '<a href="' + urlMatch + '">' + urlMatch + '</a>');

            return new Handlebars.SafeString(newMsg);
        },
        noIssue: (category) => {
            return category.rules.every((rule) => {
                return rule.status === ruleStatus.pass;
            });
        },
        noPending: (category) => {
            return category.rules.every((rule) => {
                return rule.status !== ruleStatus.pending;
            });
        },
        normalizeClassName: (value) => {
            const className = value.split('/').shift();

            return className.toLowerCase().trim()
                .replace(/[^a-z0-9]/gi, '-');
        },
        normalizePosition: function (position) {
            if (!position || parseInt(position) === -1) {
                return '';
            }

            return ':' + position;
        },
        or: (l, r) => {
            return l || r;
        },
        pagination: pagination.generate,
        passErrors: (statistics) => {
            return statistics && statistics.errors === 0;
        },
        passRule: (statistics) => {
            return statistics && (statistics.errors === 0 && statistics.warnings === 0);
        },
        passWarnings: (statistics) => {
            return statistics && statistics.warnings === 0;
        },
        pluralize: function (text, count) {
            return text + (count === 1 ? '' : 's');
        },
        reverseString: function (str) {
            return str.split('').reverse()
                .join('');
        },
        sanitize: (permalink) => {
            return permalink.replace(/\/index.html/g, '/');
        },
        setDefault: (...values) => {
            return values.reduce((accumulator, value) => {
                return accumulator || value;
            });
        },
        // Solution inspired by https://stackoverflow.com/a/10903003
        shortenString: function (string, maxLength) {
            if (!string || string.length < maxLength * 2) {
                return string;
            }

            const headChunk = self.cutString(string, maxLength);
            const reverseTailChunk = self.cutString(self.reverseString(string), maxLength);
            const tailChunk = self.reverseString(reverseTailChunk);

            return headChunk + ' … ' + tailChunk;
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

    return self;
};
