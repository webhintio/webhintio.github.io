/* eslint-env browser */
/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand, no-continue */
/* global hljs */
(function () {
    'use strict';

    /* eslint-disable */
    /** Polyfill for 'Element.closest()' */
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector ||
            Element.prototype.webkitMatchesSelector;
    }

    if (!Element.prototype.closest) {
        Element.prototype.closest = function (s) {
            var el = this;
            var ancestor = this;
            if (!document.documentElement.contains(el)) {
                return null;
            }
            do {
                if (ancestor.matches(s)) {
                    return ancestor;
                }
                ancestor = ancestor.parentElement;
            } while (ancestor !== null);
            return null;
        };
    }
    /* eslint-enable */

    var expandDetails = function (item) {
        item.setAttribute('aria-expanded', 'true');
    };

    var collapseDetails = function (item) {
        item.setAttribute('aria-expanded', 'false');
    };

    var toggleExpand = function (evt) {
        var element = evt.target;

        if (element.className.indexOf('button--details') === -1) {
            return;
        }

        var parent = element.closest('.rule-result--details');
        var expanded = parent.getAttribute('aria-expanded') === 'true';
        var name = element.getAttribute('data-rule');

        if (expanded) {
            collapseDetails(parent);
            element.innerHTML = 'open details';
            element.setAttribute('title', 'show ' + name + '\'s result details');
        } else {
            expandDetails(parent);
            element.innerHTML = 'close details';
            element.setAttribute('title', 'close ' + name + '\'s result details');
        }
    };

    var registerToggleExpandListener = function () {
        var container = document.getElementById('results-container');

        if (container) {
            container.addEventListener('click', toggleExpand, false);
        }
    };

    var endsWith = function (searchStr, str) {
        var length = str.length;
        var searchLength = searchStr.length;
        var position = str.indexOf(searchStr);

        return (length - searchLength) === position;
    };

    var onPopState = function () {
        if (endsWith('/scanner/', window.location.href)) {
            window.location.href = window.location.href;
        }
    };

    var setClipboardText = function (text) {
        var id = 'hidden-clipboard';
        var hiddenTextArea = document.getElementById(id);

        if (!hiddenTextArea) {
            var newTextArea = document.createElement('textarea');

            newTextArea.id = id;
            newTextArea.style.position = 'fixed';
            newTextArea.style.top = 0;
            newTextArea.style.left = 0;

            newTextArea.style.width = '1px';
            newTextArea.style.height = '1px';
            newTextArea.style.padding = 0;

            newTextArea.style.border = 'none';
            newTextArea.style.outline = 'none';
            newTextArea.style.boxShadow = 'none';

            newTextArea.style.background = 'transparent';
            document.querySelector('body').appendChild(newTextArea);
            hiddenTextArea = document.getElementById(id);
        }

        hiddenTextArea.value = text;
        hiddenTextArea.select();

        document.execCommand('copy');
    };

    var highlightCodeBlocks = function () {
        var codeBlocks = document.querySelectorAll('code');

        for (var i = 0; i < codeBlocks.length; i++) {
            hljs.highlightBlock(codeBlocks[i]);
        }
    };

    var copyButton = document.querySelector('.permalink-copy');
    var copyPermalinkToClipboard = function () {
        var permalink = document.querySelector('.scan-overview__body__permalink').textContent;

        setClipboardText(permalink.trim());
    };

    if (copyButton) {
        copyButton.addEventListener('click', copyPermalinkToClipboard);
    }

    window.addEventListener('popstate', onPopState, false);

    registerToggleExpandListener();
    highlightCodeBlocks();
}());
