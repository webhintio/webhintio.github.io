/* eslint-env browser */
/* eslint-disable no-var, strict, prefer-arrow-callback, object-shorthand, no-continue, array-callback-return */
/* global Handlebars */

(function () {
    'use strict';

    /* eslint-disable */
    /** Polyfill for `Element.closest()` */
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
    /** Record of published rules. */
    var existingResults = {};
    var arraify = function (list) {
        return [].slice.call(list);
    };

    var expandDetails = function (item) {
        item.setAttribute('aria-expanded', 'true');
    };

    var collapseDetails = function (item) {
        item.setAttribute('aria-expanded', 'false');
    };

    var toggleExpand = function (evt) {
        var parent = evt.target.closest('.rule-result--details');
        var expanded = parent.getAttribute('aria-expanded') === 'true';

        if (expanded) {
            collapseDetails(parent);
            evt.target.innerHTML = 'open details';
        }

        if (!expanded) {
            expandDetails(parent);
            evt.target.innerHTML = 'close details';
        }
    };

    var toParams = function (obj) {
        if (!obj) {
            return '';
        }
        var keys = Object.keys(obj);

        if (keys.length === 0) {
            return '';
        }
        var params = keys.reduce(function (p, key, index) {
            var value = `${(key === 'term' ? 'q' : key)}=${encodeURIComponent(obj[key])}`;
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
    var generateRecord = function (responseItems) {
        const record = responseItems.reduce(function (collection, item) {
            if (!item.results) {
                return collection;
            }

            for (var result in item.results) {
                if (!collection[item.name]) {
                    collection[item.name] = [];
                }
                collection[item.name].push(result.name);
            }

            return collection;
        }, {});

        return record;
    };

    /** Filter out results that are already present in the UI. */
    var filterUpdates = function (responseItems) {
        responseItems.forEach(function (responseItem) {
            if (!responseItem.results) {
                return responseItem.results;
            }

            responseItem.results = responseItem.results.filter(function (result) {
                return !(existingResults[responseItem.name] && existingResults[responseItem.name].includes(result.name));
            });
        });

        return responseItems;
    };

    var generateTemplate = function () {
        var tmpl = `{{#each categories}}
        {{#if results}}
        <section class="rule-result" id="{{name}}">
            <h3>{{name}}</h3>
            {{#each results}}
            <div class="rule-result--details" aria-expanded="false">
                <div class="rule-result--details__header">
                    <p class="rule-title">{{name}}: {{getLength messages status}}</p>
                    <div class="rule-result__docs">
                        <a href="https://sonarwhal.com/docs/user-guide/rules/{{name}}.html"><img src="/images/results-docs-icon.svg" alt="documentation"  class="docs-icon" /></a>
                        <button title="show warning details" class="button--details">Close Details</button>
                    </div>
                </div>
                {{#each messages}}
                <div class="rule-result--details__body">
                    <p class="warning-badge uppercase-text">{{../status}}</p>
                    <p>
                        {{message}}
                    </p>
                    <div class="rule-result__code">
                        <p>
                            {{cutUrlString resource}}
                            {{#if location.line}}:{{location.line}}{{/if}}
                            {{#if location.column}}:{{location.column}}{{/if}}
                        </p>
                        <code>{{cutCodeString sourceCode}}</code>
                    </div>
                </div>
                {{/each}}
            </div>
            {{/each}}
        </section>
        {{/if}}
    {{/each}}`;

        return tmpl;
    };
    var cutString = (string, lengthToShow) => {
        if (!string || string.length < lengthToShow) {
            return string;
        }

        return `${string.slice(0, lengthToShow)} ... ${string.slice(string.length - lengthToShow)}`;
    };

    var registerToggleExpandListener = function () {
        var detailButtons = arraify(document.querySelectorAll('.button--details'));

        detailButtons.map(function (button) {
            button.addEventListener('click', toggleExpand, false);
        });
    };

    var updateUI = function (data) {
        var updates = data.updates;
        var time = data.time;

        Handlebars.registerHelper('getLength', function (collection, unit) {
            const length = collection.length;

            return length > 1 ? `${length} ${unit}s` : `${length} ${unit}`;
        });

        Handlebars.registerHelper('cutUrlString', (urlString) => {
            return cutString(urlString, 20);
        });

        Handlebars.registerHelper('cutCodeString', (urlString) => {
            return cutString(urlString, 150);
        });

        var source = generateTemplate();
        var template = Handlebars.compile(source);
        var html = template({ categories: updates });
        var totalErrors = 0; // eslint-disable-line no-unused-vars
        var totalWarnings = 0; // eslint-disable-line no-unused-vars

        document.querySelector('.module.module--primary').insertAdjacentHTML('afterbegin', html);
        updates.forEach((function (update) {
            var errorSelector = `.${update.name}.errors`;
            var warningSelector = `.${update.name}.warnings`;
            var errorsNumber = parseInt(update.statistics.errors);
            var warningsNumber = parseInt(update.statistics.warnings);
            var errorsElement = document.querySelector(errorSelector);
            var warningsElement = document.querySelector(warningSelector);

            errorsElement.innerHTML = `${errorsNumber} Errors`;
            warningsElement.innerHTML = `${warningsNumber} Warnings`;

            if (errorsNumber > 0) {
                errorsElement.closest('.rule-tile').classList.remove('rule-tile--passed');
                errorsElement.closest('.rule-tile').classList.add('rule-tile--failed');
            }

            totalErrors += errorsNumber;
            totalWarnings += warningsNumber;
        }));

        document.querySelector('#total-errors').innerHTML = totalErrors;
        document.querySelector('#total-warnings').innerHTML = totalWarnings;
        document.querySelector('.scan-overview--time .scan-overview__body--purple').innerHTML = time;

        registerToggleExpandListener();
    };

    var queryAndUpdate = function () {
        console.log('Updater running...');

        var id = document.querySelector('.scan-overview').getAttribute('data-id');
        var callback = function (err, response) {
            console.log('query result received.');

            var timeoutId = setTimeout(queryAndUpdate, 2000);

            if (err) {
                console.error(err);
                clearTimeout(timeoutId);

                return;
            }

            if (response.status === 'error') {
                console.log('Scanning error.');
                clearTimeout(timeoutId);

                return;
            }

            if (response.status === 'finished') {
                clearTimeout(timeoutId);

                var updates = filterUpdates(response.result);

                updateUI({
                    time: response.time,
                    updates
                });

                existingResults = generateRecord(response.result);

                return;
            }
        };
        var options = {
            callback,
            url: `api/${id}`
        };

        xhr(options);
    };

    queryAndUpdate();
}());
