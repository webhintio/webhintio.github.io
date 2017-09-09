/* eslint-env browser */
/* eslint-disable no-var, strict, prefer-arrow-callback, object-shorthand, no-continue, array-callback-return */
//nav menu
(function () {
    'use strict';

    var arraify = function (list) {
        return [].slice.call(list);
    };

    var detailButtons = arraify(document.querySelectorAll('.button--details'));
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

    detailButtons.map(function (button) {
        button.addEventListener('click', toggleExpand, false);
    });
}());
