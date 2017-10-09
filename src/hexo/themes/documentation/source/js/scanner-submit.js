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
    /** Status variables for a job. */
    var jobStatus = {
        error: 'error',
        finished: 'finished',
        pending: 'pending',
        started: 'started'
    };
    /** Status variables for a rule. */
    var ruleStatus = {
        error: 'error',
        pass: 'pass',
        pending: 'pending',
        warning: 'warning'
    };
    /** Queue message block */
    var queueBlock = document.querySelector('.scan-queue-bg-wrap');
    /** Scan result block */
    var resultBlock = document.querySelector('.scan-result-bg-wrap');

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

    var categoryPassTemplate = function () {
        return '<div class="rule-result--details">\
        <div class="rule-result__message--passed">\
            <p>No issues</p>\
        </div>\
    </div>';
    };
    var cutString = function (string, lengthToShow) {
        if (!string || string.length < lengthToShow) {
            return string;
        }

        return string.slice(0, lengthToShow) + '...' + string.slice(string.length - lengthToShow);
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

    var updateElement = function (issueElement, issues, issueText, categoryName, final = false) {
        if (issues > 0) {
            issueElement.classList.add('rule-list--failed');
            issueElement.innerHTML = '<a href="#' + categoryName + '">' + issues + ' ' + pluralize(issueText, issues) + '</a>';

            if (final) {
                issueElement.closest('.rule-tile').classList.add('rule-tile--failed');
            }
        } else {
            issueElement.innerHTML = issues + ' ' + pluralize(issueText, issues);

            if (final) {
                issueElement.classList.add('rule-list--passed');
                issueElement.closest('.rule-tile').classList.add('rule-tile--passed');
            }
        }
    };

    var categoryScanComplete = function (category) {
        return category.rules.every(function (rule) {
            return rule.status !== jobStatus.pending;
        });
    };

    var categoryPass = function (category) {
        return category.rules.every(function (rule) {
            return rule.status === ruleStatus.pass;
        });
    };

    var updateErrorItems = function (category) {
        var container = document.getElementById(category.name);
        var loader = container.querySelector('.compiling__loader');
        var source;
        var template;
        var html;

        source = ruleItemTemplate();
        template = Handlebars.compile(source);
        html = template(category);

        container.querySelector('h3').insertAdjacentHTML('afterend', html);

        if (categoryScanComplete(category) && loader) {
            container.removeChild(loader);
        }
    };

    var updateAsPass = function (category) {
        var container = document.getElementById(category.name);
        var loader = container.querySelector('.compiling__loader');
        var passMessage = container.querySelector('.rule-result__message--passed');

        if (passMessage) {
            return;
        }

        if (loader) {
            container.removeChild(loader);
        }

        container.insertAdjacentHTML('beforeend', categoryPassTemplate());
    };

    var updateOverallData = function (category, final = false) {
        var errorSelector = '.' + category.name + '.errors';
        var warningSelector = '.' + category.name + '.warnings';
        var errorsNumber = category.statistics.errors;
        var warningsNumber = category.statistics.warnings;
        var errorsElement = document.querySelector(errorSelector);
        var warningsElement = document.querySelector(warningSelector);

        warningsElement.innerHTML = warningsNumber + ' Warnings';

        updateElement(errorsElement, errorsNumber, 'Error', category.name, final);
        updateElement(warningsElement, warningsNumber, 'Warning', category.name, final);
    };

    var updateUI = function (data) {
        // Note: `data` here is filtered, so published errors/warnings won't be included in `data`.
        var updates = data.updates;
        var time = data.time;
        var version = data.version;

        var totalErrors = 0;
        var totalWarnings = 0;

        updates.forEach(function (category) {
            // Still needs to update the UI even if `category.results` is equal to null.
            if (!category.results && categoryPass(category)) {
                updateAsPass(category);

                return;
            }

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
    };

    var showQueueMessage = function () {
        queueBlock.style.display = 'block';
        resultBlock.style.display = 'none';
    };

    var hideQueueMessage = function () {
        queueBlock.style.display = 'none';
        resultBlock.style.display = 'block';
    };

    var queryAndUpdate = function () {
        var callback = function (err, response) {
            if (err) {
                console.error(err);

                return;
            }

            if (response.status === jobStatus.error) {
                // Show to the user a message about the status and the error??.
                console.log('Scanning error.');

                return;
            }

            if (response.status === jobStatus.pending) {
                showQueueMessage();
            }

            if (response.status === jobStatus.finished || response.status === jobStatus.started) {
                hideQueueMessage();

                var updates = filterUpdates(response.categories);

                // Declaring object literals in the ES6 way not supported by 'hexo-filter-cleanup'.
                updateUI({
                    time: response.time,
                    updates: updates,
                    version: response.version
                });

                if (response.status === jobStatus.finished) {
                    response.categories.forEach(function(category) {
                        // Update the final statistics
                        updateOverallData(category, true);
                    });
                }

                generateRecord(response.categories);
                if (response.status === jobStatus.finished) {
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
    registerHandlebarsPartials();
    registerHandlebarsHelpers();

    queryAndUpdate();
}());
