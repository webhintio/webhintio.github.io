/* eslint-env browser */
/* eslint-disable no-var, object-shorthand, no-invalid-this, prefer-template */
/* globals Handlebars */
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

(function () {
    var normalizeString = function (str) {
        return str.toLowerCase().replace(/[^a-z0-9]/gi, '-');
    };

    var compare = function (left, operator, right, options) {
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

        var operators = {
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
                var normalizedR = member ? normalizeString(member) : member;
                var normalizedL = collection.split(/, */g).map(function (element) { //eslint-disable-line prefer-arrow-callback
                    return normalizeString(element);
                });

                return normalizedL.indexOf(normalizedR) !== -1;
            },
            typeof: function (l, r) {
                return typeof l === r;
            },
            '||': function (l, r) {
                return l || r;
            }
        };

        if (!operators[operator]) {
            throw new Error('Handlebars Helper "compare" doesn\'t know the operator ' + operator);
        }

        var result = operators[operator](left, right);

        if (result) {
            return options.fn(this);
        }

        return options.inverse(this);
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = { compare: compare };
    } else {
        Handlebars.registerHelper('compare', compare);
    }
}());
