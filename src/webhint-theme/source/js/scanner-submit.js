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
    /** HTML element containing the current scan time */
    var scanTimeElement = document.getElementById('scan-time');
    /** HTML element containing the current percentage of the scan */
    var percentageElement = document.getElementById('scan-percentage');
    /** Progress bar element with the current percentage */
    var percentageBarElement = document.getElementById('scan-percentage-bar');
    /** HTML element containing the total number of hints */
    var totalHintsElement = document.getElementById('total-hints');
    /** HTML element containing the version of webhint */
    var versionElement = document.getElementById('version');

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
    var generateRecord = function (category) {
        if (!category.hintsToUpdate) {
            return;
        }

        category.hintsToUpdate.forEach(function (hint) {
            if (existingResults.indexOf(hint.name) === -1) {
                existingResults.push(hint.name);
            }
        });
    };

    /** Filter out results that are already present in the UI. */
    var filterNewUpdates = function (category) {
        if (!category.hints) {
            return;
        }

        return category.hints.filter(function (hint) {
            return existingResults.indexOf(hint.name) === -1 && hint.status !== hintStatus.pending && hint.status !== hintStatus.pass;
        });
    };

    var getHTML = function (templ, data) {
        var template = ejsPartials[templ];

        return template(data);
    };

    var updateElement = function (issueElement, issues) {
        issueElement.textContent = issues;
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
            var buttonTemplate = ejsPartials['scan-expand-all']();

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

    var getHints = function (hints) {
        return hints.filter(function (hint) {
            return hint.status !== hintStatus.pending;
        });
    };

    var updateOverallData = function (category) {
        var hintsSelector = '#summary-' + category.name + ' .rule-tile__hints';
        var passedSelector = '#summary-' + category.name + ' .rule-tile__passed';
        var hints = getHints(category.hints).length;
        var passed = category.passed.length;
        var hintsElement = document.querySelector(hintsSelector);
        var passedElement = document.querySelector(passedSelector);

        updateElement(hintsElement, hints);
        updateElement(passedElement, passed);
    };

    var updateScanResultUI = function (result) {
        var categories = result.categories;

        categories.forEach(function (category) {
            if (!category.hints) {
                return;
            }

            var allHintsPass = categoryPass(category);

            if (allHintsPass) {
                updateAsPass(category);
            }

            filterNewUpdates(category);

            category.hintsToUpdate = filterNewUpdates(category);

            updateErrorItems(category);
            updateOverallData(category);

            generateRecord(category);

            if (categoryScanComplete(category)) {
                removeLoader(category);
            }
        });

        var codeBlocks = document.querySelectorAll('code');

        for (var i = 0; i < codeBlocks.length; i++) {
            hljs.highlightBlock(codeBlocks[i]);
        }

        totalHintsElement.textContent = result.hintsCount;
        scanTimeElement.textContent = result.scanTime;
        versionElement.textContent = result.version;
    };

    var updateScanFailUI = function (result) {
        var errorElement = document.getElementById('scan-error');

        if (errorElement) {
            return;
        }

        var scanErrorMessageHTML = getHTML('scan-error-message', { result: result });
        var resultsContainer = document.getElementById('results-container');

        resultsContainer.insertAdjacentHTML('beforebegin', scanErrorMessageHTML);
        resultsContainer.style.display = 'none';
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
            var current = scanTimeElement.textContent.trim();
            var parts = current.split(':');
            var minutes = parseInt(parts[0], 10);
            var seconds = parseInt(parts[1], 10);

            seconds++;

            if (seconds >= 60) {
                minutes++;
                seconds = 0;
            }

            scanTimeElement.textContent = pad(minutes.toString()) + ':' + pad(seconds.toString());
        } catch (e) {
            // Do nothing
        }
    };

    var getFinishedHints = function (hints) {
        return hints.filter(function (hint) {
            return hint.status !== hintStatus.pending;
        });
    };

    var updatePercentage = function (result) {
        var totalHints = result.categories.reduce(function (total, category) {
            total.finished += category.passed.length + getFinishedHints(category.hints).length;
            total.total += category.passed.length + category.hints.length;

            return total;
        }, { finished: 0, total: 0 });

        var percentage = totalHints.finished / totalHints.total * 100;

        percentageElement.textContent = Math.round(percentage) + '%';
        percentageBarElement.style.width = percentage + '%';

        if (percentage === 100) {
            percentageBarElement.classList.add('end-animation');
        }
    };

    var updateFavicon = function (result) {
        /*
         * We need the real reference to the favicon
         */
        var browserIcon = ejsPartials['browser-icon']({ result: result });
        var hrefRegex = /href="([^"]*)"/g;

        var exec = hrefRegex.exec(browserIcon);

        if (!exec) {
            return;
        }

        document.querySelector('link[rel="icon"]').setAttribute('href', exec[1]);
    };

    var retries = 0;

    var queryAndUpdate = function () {
        var callback = function (err, response) {
            if (err) {
                retries++;

                if (retries >= 5) {
                    // Cancel any updates if too many failed retries
                    clearInterval(timer);
                    console.error(err);

                    return;
                }

                return setTimeout(queryAndUpdate, 5000);
            }

            retries = 0;

            var result = response.result;
            var isFinish = result.status === jobStatus.finished;
            var isError = result.status === jobStatus.error;
            var isPending = result.status === jobStatus.pending;

            hideQueueMessage();

            if (isPending) {
                return setTimeout(queryAndUpdate, 5000);
            }

            if (isError) {
                updateScanFailUI(result);
            }

            updateScanResultUI(result);

            updatePercentage(result);
            updateFavicon(result);

            /*
             * The timer can be a little bit delayed
             * but this way, we are sure the time
             * start counting when the status is not pending
             */
            if (!timer) {
                timer = setInterval(updateTime, 1000);
            }

            if (isFinish || isError) {
                clearInterval(timer);

                return;
            }

            setTimeout(queryAndUpdate, 5000);
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
        // Keep queue screen for 1 minute.
        setTimeout(queryAndUpdate, 60000);
    } else {
        queryAndUpdate();
    }
}());
