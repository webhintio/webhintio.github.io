/* eslint-env browser */
/* eslint-disable no-var, strict, prefer-template, prefer-arrow-callback, object-shorthand, no-continue, no-multi-str, array-callback-return */
/* global Handlebars, hljs */

(function () {
    'use strict';

    // String interpolation is not supported by 'hexo-filter-cleanup'.
    // So use string string concatenation instead.

    /* eslint-disable */
    /** Polyfill for 'Element.closest()' */
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector ||
            Element.prototype.webkitMatchesSelector;
    }

    if (!Element.prototype.closest) {
        Element.prototype.closest = function (s) {
            var el = this;
            var ancestor = this;
            if (!document.documentElement.contains(el)) return null;
            do {
                if (ancestor.matches(s)) return ancestor;
                ancestor = ancestor.parentElement;
            } while (ancestor !== null);
            return null;
        };
    }
    /* eslint-enable */
    var id = document.querySelector('.scan-overview').getAttribute('data-id');
    /** Record of published rules. */
    var existingResults = [];

    var toParams = function (obj) {
        if (!obj) {
            return '';
        }
        var keys = Object.keys(obj);

        if (keys.length === 0) {
            return '';
        }
        var params = keys.reduce(function (p, key, index) {
            var left = key === 'term' ? 'q' : key;
            var right = encodeURIComponent(obj[key]);
            var value = left + '=' + right;
            var prefix = index === 0 ? '' : '&';

            return p + prefix + value;
        }, '?');

        return params;
    };

    var xhr = function (options) {
        var http = new XMLHttpRequest();
        var callback = options.callback;

        var url = options.url + toParams(options.query);

        http.open(options.method || 'GET', url, true);

        http.onreadystatechange = function () {
            if (http.readyState === 4) {
                if (http.status === 200) {
                    if (callback) {
                        if (options.dontTransform) {
                            return callback(null, http.responseText);
                        }

                        return callback(null, JSON.parse(http.responseText));
                    }
                } else if (callback) {
                    return callback(http.status, http.responseText);
                }
            }

            return null;
        };
        http.send(options.params);

        return http;
    };
    /** Generate record of what rules have been published. */
    var generateRecord = function (categories) {
        categories.forEach(function (category) {
            if (!category.results) {
                return;
            }

            category.results.forEach(function (result) {
                if (existingResults.indexOf(result.name) === -1) {
                    existingResults.push(result.name);
                }
            });
        });
    };

    /** Filter out results that are already present in the UI. */
    var filterUpdates = function (categories) {
        categories.forEach(function (category) {
            if (!category.results) {
                return category.results;
            }

            category.results = category.results.filter(function (result) {
                return existingResults.indexOf(result.name) === -1;
            });
        });

        return categories;
    };

    var ruleItemTemplate = function () {
        return '{{#each results}} \
            <div class="rule-result--details" aria-expanded="false" id="{{name}}"> \
            <div class="rule-result--details__header"> \
                <p class="rule-title">{{name}}: {{getLength messages status}}</p> \
                <div class="rule-result__docs"> \
                    <a href="https://sonarwhal.com/docs/user-guide/rules/{{name}}.html"><img src="/images/results-docs-icon.svg" alt="documentation"  class="docs-icon" /></a> \
                    <button title="show warning details" class="button--details">Open Details</button> \
                </div> \
            </div> \
            {{#each messages}} \
            <div class="rule-result--details__body"> \
                <p class="warning-badge uppercase-text">{{../status}}</p> \
                <p> \
                    {{message}} \
                </p> \
                <div class="rule-result__code"> \
                    <p> \
                        {{cutUrlString resource}} \
                        {{#if location.line}}:{{location.line}}{{/if}} \
                        {{#if location.column}}:{{location.column}}{{/if}} \
                    </p> \
                    <code class="html">{{cutCodeString sourceCode}}</code> \
                </div> \
            </div> \
            {{/each}} \
        </div> \
    {{/each}}';
    };

    var categoryTemplate = function () {
        var tmpl = '{{#if results}} \
        <section class="rule-result" id="{{name}}"> \
            <h3>{{name}}</h3> \
            {{> ruleItem}} \
        </section> \
        {{/if}}';

        return tmpl;
    };

    var cutString = function (string, lengthToShow) {
        if (!string || string.length < lengthToShow) {
            return string;
        }

        return string.slice(0, lengthToShow) + '...' + string.slice(string.length - lengthToShow);
    };

    var closeOverlay = function () {
        document.querySelector('.nellie-waiting').classList.remove('open');
    };

    var openOverlay = function () {
        document.querySelector('.nellie-waiting').classList.add('open');
    };

    var registerHandlebarsPartials = function () {
        Handlebars.registerPartial('ruleItem', ruleItemTemplate());
    };

    var registerHandlebarsHelpers = function () {
        Handlebars.registerHelper('getLength', function (collection, unit) {
            var length = collection.length;
            var s = length > 1 ? 's' : '';

            return length + ' ' + unit + s;
        });

        Handlebars.registerHelper('cutUrlString', function (urlString) {
            return cutString(urlString, 20);
        });

        Handlebars.registerHelper('cutCodeString', function (urlString) {
            return cutString(urlString, 150);
        });
    };

    var pluralize = function (text, count) {
        return text + (count === 1 ? '' : 's');
    };

    var updateElement = function (issueElement, issues, issueText, categoryName) {
        if (issues > 0) {
            issueElement.classList.remove('rule-list--passed');
            issueElement.classList.add('rule-list--failed');
            issueElement.closest('.rule-tile').classList.remove('rule-tile--passed');
            issueElement.closest('.rule-tile').classList.add('rule-tile--failed');
            issueElement.innerHTML = '<a href="#' + categoryName + '">' + issues + ' ' + pluralize(issueText, issues) + '</a>';
        } else {
            issueElement.innerHTML = issues + ' ' + pluralize(issueText, issues);
        }
    };

    var updateErrorItems = function (category) {
        var container = document.getElementById(category.name);
        var source;
        var template;
        var html;

        if (!container) {
            source = categoryTemplate();
            template = Handlebars.compile(source);
            html = template(category);

            document.querySelector('.module.module--primary').insertAdjacentHTML('afterbegin', html);
        } else {
            source = ruleItemTemplate();
            template = Handlebars.compile(source);
            html = template(category);

            container.insertAdjacentHTML('beforeend', html);
        }
    };

    var updateOverallData = function (category) {
        var errorSelector = '.' + category.name + '.errors';
        var warningSelector = '.' + category.name + '.warnings';
        var errorsNumber = category.statistics.errors;
        var warningsNumber = category.statistics.warnings;
        var errorsElement = document.querySelector(errorSelector);
        var warningsElement = document.querySelector(warningSelector);

        warningsElement.innerHTML = warningsNumber + ' Warnings';

        updateElement(errorsElement, errorsNumber, 'Error', category.name);
        updateElement(warningsElement, warningsNumber, 'Warning', category.name);
    };

    var updateUI = function (data) {
        var updates = data.updates;
        var time = data.time;
        var version = data.version;

        var totalErrors = 0;
        var totalWarnings = 0;

        updates.forEach(function (category) {
            if (!category.results) {
                return;
            }

            updateErrorItems(category);

            updateOverallData(category);

            totalErrors += category.statistics.errors;
            totalWarnings += category.statistics.warnings;
        });

        var codeBlocks = document.querySelectorAll('code');

        for (var i = 0; i < codeBlocks.length; i++) {
            hljs.highlightBlock(codeBlocks[i]);
        }

        document.querySelector('#total-errors').innerHTML = totalErrors;
        document.querySelector('#total-warnings').innerHTML = totalWarnings;
        document.querySelector('.scan-overview--time .scan-overview__body--purple').innerHTML = time;
        document.querySelector('.scan-overview--version .scan-overview__body--purple').innerHTML = version;
        closeOverlay();
    };

    var status = {
        error: 'error',
        finished: 'finished',
        pending: 'pending',
        started: 'started'
    };

    var queryAndUpdate = function () {
        var callback = function (err, response) {
            if (err) {
                console.error(err);

                return;
            }

            if (response.status === status.error) {
                // Show to the user a message about the status and the error??.
                console.log('Scanning error.');

                return;
            }

            if (response.status === status.finished || response.status === status.started) {
                var updates = filterUpdates(response.categories);

                // Declaring object literals in the ES6 way not supported by 'hexo-filter-cleanup'.
                updateUI({
                    time: response.time,
                    updates: updates,
                    version: response.version
                });

                generateRecord(response.categories);
                if (response.status === status.finished) {
                    console.log('finished');

                    return;
                }
            }

            setTimeout(queryAndUpdate, 1000);
        };

        var url = 'api/' + id;
        // Declaring object literals in the ES6 way not supported by 'hexo-filter-cleanup'.
        var options = {
            callback: callback,
            url: url
        };

        xhr(options);
    };

    var initExistingResults = function () {
        var existing = document.querySelectorAll('.rule-result--details');

        for (var i = 0; i < existing.length; i++) {
            existingResults.push(existing[i].id);
        }
    };

    window.history.pushState(null, null, id);

    initExistingResults();

    openOverlay();

    registerHandlebarsPartials();
    registerHandlebarsHelpers();

    queryAndUpdate();
}());
