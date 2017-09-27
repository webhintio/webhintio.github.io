/* eslint-env browser */
/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand, no-continue */
(function () {
    'use strict';

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
        if (evt.target.className.indexOf('button--details') === -1) {
            return;
        }

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

    // var registerToggleExpandListener = function () {
    //     var detailButtons = arraify(document.querySelectorAll('.button--details'));

    //     detailButtons.map(function (button) { //eslint-disable-line array-callback-return
    //         button.addEventListener('click', toggleExpand, false);
    //     });
    // };

    var registerToggleExpandListener = function () {
        var container = document.getElementById('results-container');

        container.addEventListener('click', toggleExpand, false);
    };

    registerToggleExpandListener();
}());
