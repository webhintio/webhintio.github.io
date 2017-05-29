/* eslint-env browser */
/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand, no-continue */
//nav menu
(function () {
    'use strict';

    var icons = document.querySelectorAll('.treeview .icon');

    var toggleAriaExpanded = function (evt) {
        var parentTreeitem = evt.currentTarget.parentElement.parentElement;
        var expanded = parentTreeitem.getAttribute('aria-expanded') === 'true';

        if (expanded) {
            parentTreeitem.setAttribute('aria-expanded', 'false');
        }

        if (!expanded) {
            parentTreeitem.setAttribute('aria-expanded', 'true');
        }
    };

    var toggleKeydownAriaExpanded = function (evt) {
        var key = evt.which || evt.keyCode;

        if (key !== 32 && key !== 13) {
            return;
        }

        toggleAriaExpanded(evt);
    };

    for (var i = 0; i < icons.length; i++) {
        icons[i].addEventListener('click', toggleAriaExpanded, false);
        icons[i].addEventListener('keydown', toggleKeydownAriaExpanded, false);
    }
}());
