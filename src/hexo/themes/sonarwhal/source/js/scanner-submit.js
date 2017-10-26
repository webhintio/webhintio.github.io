/* eslint-env browser */
/* eslint-disable no-var, strict, prefer-template, prefer-arrow-callback, object-shorthand, no-continue, no-multi-str, array-callback-return */
/* global Handlebars, hljs */

(function () {
    'use strict';

    // String interpolation is not supported by 'hexo-filter-cleanup'.
    // So use string string concatenation instead.

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
    /** Id of the timer timeout. */
    var timer;

    var xhr = function (options) {
        var http = new XMLHttpRequest();
        var callback = options.callback;
        var url = options.url;

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
    var filterNewUpdates = function (categories) {
        categories.forEach(function (category) {
            if (!category.results) {
                return;
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
                                <a href="https://sonarwhal.com/docs/user-guide/rules/{{name}}/" title="documentation for {{name}} rule"><img src="/images/results-docs-icon.svg" alt="" class="docs-icon" /></a> \
                                <button title="show warning details" class="button--details">Open Details</button> \
                            </div> \
                        </div> \
                        {{#each messages}} \
                        <div class="rule-result--details__body"> \
                            <p class="{{../status}}-badge uppercase-text">{{../status}}</p> \
                            <p> \
                                {{message}} \
                            </p> \
                            {{#or resource sourceCode}} \
                            <div class="rule-result__code"> \
                                {{#if resource}} \
                                <p> \
                                    <a target="_blank" rel="noopener noreferrer" href="{{resource}}"> \
                                        {{cutUrlString resource}}{{normalizePosition location.line}}{{normalizePosition location.column}} \
                                    </a> \
                                </p> \
                                {{/if}} \
                                {{#if sourceCode}} \
                                <code>{{cutCodeString sourceCode}}</code> \
                                {{/if}} \
                            </div> \
                            {{/or}} \
                        </div> \
                        {{/each}} \
                        {{#if thirdParty}} \
                            <div class="rule-result--details__footer-msg"> \
                                {{#if thirdParty.details}} \
                                    <p>To learn more visit</p> \
                                {{else}} \
                                    <p>With the help of</p> \
                                {{/if}} \
                                {{#if thirdParty.link}} \
                                    <a href="{{thirdParty.link}}" target="_blank"> \
                                {{/if}} \
                                        <img src="{{thirdParty.logo.url}}" alt="{{thirdParty.logo.alt}}" class="{{thirdParty.logo.name}}-logo" /> \
                                {{#if thirdParty.link}} \
                                    </a> \
                                {{/if}} \
                            </div> \
                        {{/if}} \
                    </div> \
                {{/each}}';
    };

    var categoryPassMessageTemplate = function () {
        return '<div class="rule-result--details">\
                    <div class="rule-result__message--passed">\
                        <p>No issues</p>\
                    </div>\
                </div>';
    };

    var getHTML = function (templ, data) {
        var source = templ();
        var template = Handlebars.compile(source);

        return template(data);
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
        Handlebars.registerHelper('or', function (left, right, options) {
            if (left || right) {
                return options.fn(this); // eslint-disable-line no-invalid-this
            }

            return options.inverse(this); // eslint-disable-line no-invalid-this
        });
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

        Handlebars.registerHelper('normalizePosition', function (position) {
            if (!position || parseInt(position) === -1) {
                return '';
            }

            return ':' + position;
        });
    };

    var pluralize = function (text, count) {
        return text + (count === 1 ? '' : 's');
    };

    var updateElement = function (issueElement, issues, issueText, categoryName, allRulesPass, allRulesChecked) {
        if (issues > 0) {
            issueElement.classList.add('rule-list--failed');
            issueElement.innerHTML = issues + ' ' + pluralize(issueText, issues);
            issueElement.closest('.rule-tile').classList.add('rule-tile--failed');
        } else {
            issueElement.innerHTML = issues + ' ' + pluralize(issueText, issues);

            if (allRulesChecked) {
                // No pending rules, safe to update rule list class.
                issueElement.classList.add('rule-list--passed');
            }

            if (allRulesPass) {
                // No errors or warnings, safe to update the rule tile class.
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

    var filterErrorsAndWarnings = function (results) {
        return results.filter(function (result) {
            return result.status !== ruleStatus.pass;
        });
    };

    var updateErrorItems = function (category) {
        if (!category.results || category.results.length === 0) {
            return;
        }

        var container = document.getElementById(category.name);
        var loader = container.querySelector('.compiling__loader');
        var ruleResult = getHTML(ruleItemTemplate, category);

        loader.insertAdjacentHTML('beforebegin', ruleResult);
    };

    var removeLoader = function (category) {
        var container = document.getElementById(category.name);
        var loader = container.querySelector('.compiling__loader');

        if (loader) {
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

        container.insertAdjacentHTML('beforeend', categoryPassMessageTemplate());
    };

    var noPendingRules = function (category) {
        return category.rules.every(function (rule) {
            return rule.status !== ruleStatus.pending;
        });
    };

    var updateOverallData = function (category, allRulesPass, allRulesChecked) {
        var errorSelector = '.' + category.name + '.errors';
        var warningSelector = '.' + category.name + '.warnings';
        var errorsNumber = category.statistics.errors;
        var warningsNumber = category.statistics.warnings;
        var errorsElement = document.querySelector(errorSelector);
        var warningsElement = document.querySelector(warningSelector);

        warningsElement.innerHTML = warningsNumber + ' Warnings';

        updateElement(errorsElement, errorsNumber, 'Error', category.name, allRulesPass, allRulesChecked);
        updateElement(warningsElement, warningsNumber, 'Warning', category.name, allRulesPass, allRulesChecked);
    };

    var updateScanResultUI = function (data) {
        // Note: `data` here is filtered, so published errors/warnings won't be included in `data`.
        var updates = data.updates;
        var time = data.time;
        var version = data.version;

        var totalErrors = 0;
        var totalWarnings = 0;

        updates.forEach(function (category) {
            if (!category.results) {
                return;
            }

            var allRulesPass = categoryPass(category);
            var allRulesChecked = noPendingRules(category);
            // We need this flag to decide if we should update the rule list class.

            if (allRulesPass) {
                updateAsPass(category);
            }

            category.results = filterErrorsAndWarnings(category.results);

            updateErrorItems(category);
            updateOverallData(category, allRulesPass, allRulesChecked);

            totalErrors += category.statistics.errors;
            totalWarnings += category.statistics.warnings;

            if (categoryScanComplete(category)) {
                removeLoader(category);
            }
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

    var updateScanFailUI = function () {
        var scanErrorMessageHTML = '<div class="scan-error">\
        <p>\
        There was an error and we were only able to partially complete the scan. View the results below or\
        <a href="https://sonarwhal.com/scanner/">perform another scan</a>.\
    <p>\
    </div>';

        document.querySelector('#results-container').insertAdjacentHTML('beforebegin', scanErrorMessageHTML);
    };

    var showQueueMessage = function () {
        queueBlock.style.display = 'block';
        resultBlock.style.display = 'none';
    };

    var hideQueueMessage = function () {
        queueBlock.style.display = 'none';
        resultBlock.style.display = 'block';
    };

    var pad = function (timeString) {
        return timeString && timeString.length === 1 ? '0' + timeString : timeString;
    };

    var updateTime = function () {
        try {
            var element = document.querySelector('.scan-overview--time .scan-overview__body--purple');
            var current = element.innerHTML;
            var parts = current.split(':');
            var minutes = parseInt(parts[0], 10);
            var seconds = parseInt(parts[1], 10);

            seconds++;

            if (seconds >= 60) {
                minutes++;
                seconds = 0;
            }

            element.innerHTML = pad(minutes.toString()) + ':' + pad(seconds.toString());
        } catch (e) {
            // Do nothing
        }
    };

    var updateStatus = function (status) {
        var statusElement = document.querySelector('.scan-overview__status');

        statusElement.textContent = status;
        statusElement.classList.remove('analyzing');
    };

    var queryAndUpdate = function () {
        var callback = function (err, response) {
            var isFinish = response.status === jobStatus.finished;
            var isError = response.status === jobStatus.error;
            var isPending = response.status === jobStatus.pending;

            if (err) {
                clearInterval(timer);
                console.error(err);

                return;
            }

            if (isPending) {
                showQueueMessage();
            } else {
                hideQueueMessage();

                if (isError) {
                    updateScanFailUI();
                }

                var updates = filterNewUpdates(response.categories);

                // Declaring object literals in the ES6 way not supported by 'hexo-filter-cleanup'.
                updateScanResultUI({
                    time: response.time,
                    updates: updates,
                    version: response.version
                });

                generateRecord(response.categories);

                if (isFinish || isError) {
                    clearInterval(timer);
                    updateStatus(response.status);

                    return;
                }
            }

            setTimeout(queryAndUpdate, 5000);
        };

        var url = 'api/' + id;
        // Declaring object literals in the ES6 way not supported by 'hexo-filter-cleanup'.
        var options = {
            callback: callback,
            url: url
        };

        if (!timer) {
            timer = setInterval(updateTime, 1000);
        }

        xhr(options);
    };

    var initExistingResults = function () {
        var existing = document.querySelectorAll('.rule-result--details');

        for (var i = 0; i < existing.length; i++) {
            existingResults.push(existing[i].id);
        }
    };

    var queuePageVisible = function () {
        return document.querySelector('.scan-queue-bg-wrap').style.display !== 'none';
    };

    window.history.pushState(null, null, id);

    initExistingResults();
    registerHandlebarsPartials();
    registerHandlebarsHelpers();

    if (queuePageVisible()) {
        setTimeout(queryAndUpdate, 10000);
    } else {
        queryAndUpdate();
    }
}());
