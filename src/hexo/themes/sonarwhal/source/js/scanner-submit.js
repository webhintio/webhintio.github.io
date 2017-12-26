/* eslint-env browser */
/* eslint-disable no-var, strict, prefer-template, prefer-arrow-callback, object-shorthand, no-continue, no-multi-str, array-callback-return, no-useless-escape */
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
    /** Total number of errors and warnings. */
    var overallStatistics;

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
        return '\{{#each results}}\
                    {{>scan-result-item}}\
                 \{{/each}}';
    };

    var categoryPassMessageTemplate = function () {
        return '{{>category-pass-message}}';
    };

    var getHTML = function (templ, data) {
        var source = templ();
        var template = Handlebars.compile(source);

        return template(data);
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

            if (categoryScanComplete(category)) {
                removeLoader(category);
            }
        });

        var codeBlocks = document.querySelectorAll('code');

        for (var i = 0; i < codeBlocks.length; i++) {
            hljs.highlightBlock(codeBlocks[i]);
        }

        document.querySelector('#total-errors').innerHTML = overallStatistics.errors;
        document.querySelector('#total-warnings').innerHTML = overallStatistics.warnings;
        document.querySelector('.scan-overview--time .scan-overview__body--purple').innerHTML = time;
        document.querySelector('.scan-overview--version .scan-overview__body--purple').innerHTML = version;
    };

    var updateScanFailUI = function () {
        var scanErrorMessageHTML = '{{>scan-error-message}}';

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

    var updateFavicon = function (status, statistics) {
        var favicons = {
            failed: 'failed',
            passed: 'passed'
        };
        var totalErrors = statistics.errors;
        var totalWarnings = statistics.warnings;

        var statisticsPass = (totalErrors === 0) && (totalWarnings === 0);
        var newFavicon = (status !== jobStatus.error) && statisticsPass ? favicons.passed : favicons.failed;
        var newFaviconHref = '/images/favicon_' + newFavicon + '.ico';

        document.querySelector('.favicon').setAttribute('href', newFaviconHref);
    };

    var queryAndUpdate = function () {
        var callback = function (err, response) {
            var isFinish = response.status === jobStatus.finished;
            var isError = response.status === jobStatus.error;
            var isPending = response.status === jobStatus.pending;

            overallStatistics = response.overallStatistics;

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
                    updateFavicon(response.status, overallStatistics);

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

    if (queuePageVisible()) {
        setTimeout(queryAndUpdate, 10000);
    } else {
        queryAndUpdate();
    }
}());
