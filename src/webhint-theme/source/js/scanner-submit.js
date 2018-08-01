/* global ejsPartials, hljs */

(function () {
    // String interpolation is not supported by 'hexo-filter-cleanup'.
    // So use string string concatenation instead.

    var overview = document.querySelector('.scan-overview');

    if (!overview) {
        return;
    }
    var id = overview.getAttribute('data-id');
    /** Record of published hints. */
    var existingResults = [];
    /** Status variables for a job. */
    var jobStatus = {
        error: 'error',
        finished: 'finished',
        pending: 'pending',
        started: 'started'
    };
    /** Status variables for a hint. */
    var hintStatus = {
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

    /** Generate record of what hints have been published. */
    var generateRecord = function (result) {
        result.categories.forEach(function (category) {
            if (!category.hints) {
                return;
            }

            category.hintsToUpdate.forEach(function (hint) {
                if (existingResults.indexOf(hint.name) === -1) {
                    existingResults.push(hint.name);
                }
            });
        });
    };

    /** Filter out results that are already present in the UI. */
    var filterNewUpdates = function (result) {
        result.categories.forEach(function (category) {
            if (!category.hints) {
                return;
            }

            category.hintsToUpdate = category.hints.filter(function (hint) {
                return existingResults.indexOf(hint.name) === -1 && hint.status !== hintStatus.pending;
            });
        });
    };

    var getHTML = function (templ, data) {
        var template = ejsPartials[templ];

        return template(data);
    };

    var pluralize = function (text, count) {
        return text + (count === 1 ? '' : 's');
    };

    var updateElement = function (issueElement, issues, issueText, allHintsPass, allHintsChecked) {
        if (issues > 0) {
            issueElement.classList.add('rule-list--failed');
            issueElement.innerHTML = issues + ' ' + pluralize(issueText, issues);
            issueElement.closest('.rule-tile').classList.add('rule-tile--failed');
        } else {
            issueElement.innerHTML = issues + ' ' + pluralize(issueText, issues);

            if (allHintsChecked) {
                // No pending hints, safe to update hint list class.
                issueElement.classList.add('rule-list--passed');
            }

            if (allHintsPass) {
                // No errors or warnings, safe to update the hint tile class.
                issueElement.closest('.rule-tile').classList.add('rule-tile--passed');
            }
        }
    };

    var categoryScanComplete = function (category) {
        return category.hints.every(function (hint) {
            return hint.status !== jobStatus.pending;
        });
    };

    var categoryPass = function (category) {
        return category.hints.every(function (hint) {
            return hint.status === hintStatus.pass;
        });
    };

    var filterErrorsAndWarnings = function (hints) {
        return hints.filter(function (hint) {
            return hint.status !== hintStatus.pass;
        });
    };

    var updateErrorItems = function (category) {
        if (!category.hintsToUpdate || category.hintsToUpdate.length === 0) {
            return;
        }

        var container = document.getElementById(category.name);
        var expandAllButton = container.querySelector('.button-expand-all');
        var loader = container.querySelector('.compiling__loader');
        var hintResult = '';

        category.hintsToUpdate.forEach(function (hint) {
            hintResult += getHTML('scan-result-item', {
                hint: hint,
                isScanner: category.isScanner,
                utils: window.utils
            });
        });

        if (!expandAllButton) {
            var buttonTemplate = '<button title="expand" class="button-expand-all closed">+ expand all</button>';

            container.querySelector('.rule-result--category').insertAdjacentHTML('beforeend', buttonTemplate);
        }

        loader.insertAdjacentHTML('beforebegin', hintResult);
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

        var categoryPassMessageTemplateHtml = getHTML('category-pass-message', {});

        container.insertAdjacentHTML('beforeend', categoryPassMessageTemplateHtml);
    };

    var noPendingHints = function (category) {
        return category.hints.every(function (hint) {
            return hint.status !== hintStatus.pending;
        });
    };

    var updateOverallData = function (category, allHintsPass, allHintsChecked) {
        var errorSelector = '.' + category.name + '.errors';
        var warningSelector = '.' + category.name + '.warnings';
        var errorsNumber = category.errors;
        var warningsNumber = category.warnings;
        var errorsElement = document.querySelector(errorSelector);
        var warningsElement = document.querySelector(warningSelector);

        updateElement(errorsElement, errorsNumber, 'Error', allHintsPass, allHintsChecked);
        updateElement(warningsElement, warningsNumber, 'Warning', allHintsPass, allHintsChecked);
    };

    var updateScanResultUI = function (result) {
        // Note: `result` here is filtered, so published errors/warnings won't be included in `data`.
        var categories = result.categories;
        var time = result.scanTime;
        var version = result.version;

        categories.forEach(function (category) {
            if (!category.hints) {
                return;
            }

            var allHintsPass = categoryPass(category);
            var allHintsChecked = noPendingHints(category);
            // We need this flag to decide if we should update the hint list class.

            if (allHintsPass) {
                updateAsPass(category);
            }

            category.hintsToUpdate = filterErrorsAndWarnings(category.hintsToUpdate);

            updateErrorItems(category);
            updateOverallData(category, allHintsPass, allHintsChecked);

            if (categoryScanComplete(category)) {
                removeLoader(category);
            }
        });

        var codeBlocks = document.querySelectorAll('code');

        for (var i = 0; i < codeBlocks.length; i++) {
            hljs.highlightBlock(codeBlocks[i]);
        }

        document.querySelector('#total-errors').innerHTML = result.errors;
        document.querySelector('#total-warnings').innerHTML = result.warnings;
        document.querySelector('.scan-overview--time .scan-overview__body--purple').innerHTML = time;
        document.querySelector('.scan-overview--version .scan-overview__body--purple').innerHTML = version;
    };

    var updateScanFailUI = function () {
        var errorElement = document.getElementById('scan-error');

        if (errorElement) {
            return;
        }

        var scanErrorMessageHTML = getHTML('scan-error-message', {});

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

    var updateFavicon = function (result) {
        var favicons = {
            failed: 'failed',
            passed: 'passed'
        };
        var totalErrors = result.errors;
        var totalWarnings = result.warnings;

        var statisticsPass = (totalErrors === 0) && (totalWarnings === 0);
        var newFavicon = (result.status !== jobStatus.error) && statisticsPass ? favicons.passed : favicons.failed;
        var newFaviconHref = '/static/images/favicon_' + newFavicon + '.ico';

        document.querySelector('link[rel="icon"]').setAttribute('href', newFaviconHref);
    };

    var queryAndUpdate = function () {
        var callback = function (err, response) {
            var result = response.result;
            var isFinish = result.status === jobStatus.finished;
            var isError = result.status === jobStatus.error;
            var isPending = result.status === jobStatus.pending;

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

                filterNewUpdates(result);

                // Declaring object literals in the ES6 way not supported by 'hexo-filter-cleanup'.
                updateScanResultUI(result);

                generateRecord(result);

                if (isFinish || isError) {
                    clearInterval(timer);
                    updateStatus(result.status);
                    updateFavicon(result);

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
            var ruleId = existing[i].id;

            if (ruleId) {
                existingResults.push(ruleId);
            }
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
