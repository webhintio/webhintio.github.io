/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand */
/* eslint-env browser */
/*eslint-disable*/
// Pollyfill for :scope in selectors API 2 from http://stackoverflow.com/a/17989803/414145
(function (doc, proto) {
    try { // check if browser supports :scope natively
        doc.querySelector(':scope body');
    } catch (err) { // polyfill native methods if it doesn't
        ['querySelector', 'querySelectorAll'].forEach(function (method) {
            var nativ = proto[method];
            proto[method] = function (selectors) {
                if (/(^|,)\s*:scope/.test(selectors)) { // only if selectors contains :scope
                    var id = this.id; // remember current element id
                    this.id = 'ID_' + Date.now(); // assign new unique id
                    selectors = selectors.replace(/((^|,)\s*):scope/g, '$1#' + this.id); // replace :scope with #ID
                    var result = doc[method](selectors);
                    this.id = id; // restore previous id
                    return result;
                } else {
                    return nativ.call(this, selectors); // use native code for other selectors
                }
            }
        });
    }
})(window.document, Element.prototype);
/*eslint-enable*/

/* global setImmediate */
(function () {
    'use strict';

    var supportDetails = 'open' in document.createElement('details');

    var animateOpen = function (parent, content) {
        var contentHeight = content.offsetHeight;

        content.style.height = contentHeight + 'px';
    };

    var animateClose = function (content) {
        content.style.height = '';
        content.parentElement.removeAttribute('open');
    };

    var toggleDetails = function (button) {
        var parent = button.parentElement;
        var content = parent.querySelector(':scope > div');

        if (typeof parent.getAttribute('open') === 'string') {
            animateClose(content);
        } else {
            parent.setAttribute('open', 'open');
            animateOpen(parent, content);
        }
    };

    var updateUrl = function (target) {
        var basePath = target.getAttribute('data-pathname');
        var path = target.parentElement.getAttribute('id');
        var pathname = window.location.href;

        if (!basePath || !path) {
            return;
        }

        var loc = pathname.substr(0, pathname.indexOf(basePath)) + basePath + path + '/';

        window.history.pushState('', '', loc + location.search);
    };

    var shim = function () {
        var accordionButtons = document.querySelectorAll('[role="group"] [role="button"]');

        for (var i = 0, li = accordionButtons.length; i < li; i++) {
            var button = accordionButtons[i];

            button.setAttribute('tabindex', '0');
            var parent = button.parentElement;

            if (typeof parent.getAttribute('open') === 'string') {
                var content = parent.querySelector('div');

                content.style.height = content.offsetHeight + 'px';
            }
        }
    };

    var onToggleAccordion = function (e, target) {
        var ariaExpanded = target.getAttribute('aria-expanded');
        var keydown = e.type === 'keydown';
        var key;

        if (keydown) {
            key = e.which || e.keyCode;

            if (key !== 32 && key !== 13) {
                return;
            }
        }

        e.preventDefault();

        toggleDetails(target);

        if (ariaExpanded === 'false' || !ariaExpanded) {
            target.setAttribute('aria-expanded', 'true');
            updateUrl(target);
        } else {
            target.setAttribute('aria-expanded', 'false');
        }
    };

    var findSummary = function (element) {
        if (element.nodeName === 'SUMMARY' && element.getAttribute('role') === 'button') {
            return element;
        }
        if (element.parentElement) {
            return findSummary(element.parentElement);
        }

        return null;
    };

    var registerEvents = function () {
        document.addEventListener('click', function (evt) {
            var target = evt.target || evt.srcElement;
            var source = findSummary(target);

            if (source) {
                onToggleAccordion(evt, source);
            }
        }, false);

        document.addEventListener('keydown', function (evt) {
            var target = evt.target || evt.srcElement;
            var source = findSummary(target);

            if (source) {
                onToggleAccordion(evt, source);
            }
        }, false);
    };

    var polyfillSetImmediate = function () {
        window.setImmediate = window.setImmediate || function (func) {
            setTimeout(func, 0);
        };
    };

    var scrollIfNeeded = function () {
        var buttons = document.querySelectorAll('summary[data-pathname]');

        if (buttons.length === 0) {
            return;
        }
        var paths = window.location.pathname.split('/');
        var path = paths.pop();

        while (path === '' && paths.length > 0) {
            path = paths.pop();
        }

        if (path === '') {
            return;
        }

        for (var i = 0; i < buttons.length; i++) {
            var summary = buttons[i];

            if (summary.parentElement.getAttribute('id').indexOf(path) === 0) {
                /*eslint-disable no-loop-func*/
                setImmediate(function () {
                    window.scrollTo(0, summary.offsetTop - summary.offsetHeight);
                }, 0);
                /*eslint-enable no-loop-func*/
                summary.click();
                break;
            }
        }
    };

    window.addEventListener('load', function () {
        polyfillSetImmediate();
        registerEvents();
        scrollIfNeeded();
        if (!supportDetails) {
            shim();
        }
    });
}());
