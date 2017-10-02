/* eslint-env browser */
/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand, no-continue */
(function () {
    'use strict';

    var expandDetails = function (item) {
        item.setAttribute('aria-expanded', 'true');
    };

    var collapseDetails = function (item) {
        item.setAttribute('aria-expanded', 'false');
    };

    var toggleExpand = function (evt) {
        if (evt.target.className.indexOf('button--details') === -1) {
            return;
        }

        var parent = evt.target.closest('.rule-result--details');
        var expanded = parent.getAttribute('aria-expanded') === 'true';

        if (expanded) {
            collapseDetails(parent);
            evt.target.innerHTML = 'open details';
        } else {
            expandDetails(parent);
            evt.target.innerHTML = 'close details';
        }
    };

    var registerToggleExpandListener = function () {
        var container = document.getElementById('results-container');

        container.addEventListener('click', toggleExpand, false);
    };

    var endsWith = function (searchStr, str) {
        const length = str.length;
        const searchLength = searchStr.length;
        const position = str.indexOf(searchStr);

        return (length - searchLength) === position;
    };

    var onPopState = function () {
        if (window.location.href.indexOf('#') !== -1 || endsWith('/scanner/', window.location.href)) {
            window.location.href = window.location.href;
        }
    };

    window.addEventListener('popstate', onPopState, false);

    registerToggleExpandListener();
}());
