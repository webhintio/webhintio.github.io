/* eslint-env browser */
/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand, no-continue */
//nav menu
(function () {
    'use strict';

    var tocTitleButtons = document.querySelectorAll('.toc-expand-arrow');

    var toggleToC = function (evt) {
        var handle = evt.currentTarget.parentElement;
        var expanded = handle.getAttribute('aria-expanded') === 'true';

        if (expanded) {
            handle.parentElement.querySelector('.toc-subsection-title').setAttribute('aria-hidden', 'true');
            handle.setAttribute('aria-expanded', 'false');
        }

        if (!expanded) {
            handle.parentElement.querySelector('.toc-subsection-title').removeAttribute('aria-hidden');
            handle.setAttribute('aria-expanded', 'true');
        }
    };

    var toggleKeydownToC = function (evt) {
        var key = evt.which || evt.keyCode;

        if (key !== 32 && key !== 13) {
            return;
        }

        toggleToC(evt);
    };

    for (var i = 0; i < tocTitleButtons.length; i++) {
        tocTitleButtons[i].addEventListener('click', toggleToC, false);
        tocTitleButtons[i].addEventListener('keydown', toggleKeydownToC, false);
    }
}());
