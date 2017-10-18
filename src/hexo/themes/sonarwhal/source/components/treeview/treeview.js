/* eslint-env browser */
/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand, no-continue, array-callback-return */
//nav menu
(function () {
    'use strict';

    const arraify = function (list) {
        return [].slice.call(list);
    };

    var treeview = document.querySelector('[role="tree"]');

    if (!treeview) {
        return;
    }

    var treeitems = arraify(document.querySelectorAll('[role="treeitem"]'));
    var tocSectionTitle = arraify(document.querySelectorAll('.toc-section-title, .toc-section-title--active'));
    var findParentElementByAttribute = function (element, attrName, attrValue) {
        var currentElement = element;

        while (currentElement) {
            if (currentElement.hasAttribute(attrName) && (currentElement.getAttribute(attrName) === attrValue)) {
                return currentElement;
            }

            currentElement = currentElement.parentElement;
        }
    };

    var getClosestTreeElement = function (element) {
        return findParentElementByAttribute(element, 'role', 'treeitem');
    };

    var getClosestParentTreeElement = function (element) {
        return findParentElementByAttribute(element.parentElement, 'role', 'treeitem');
    };

    var enableTab = function (item) {
        var links = arraify(item.querySelectorAll('a[href]'));

        links.map(function (link) {
            link.removeAttribute('tabindex');
        });
    };

    var disableTab = function (item) {
        var links = arraify(item.querySelectorAll('a[href]'));

        links.map(function (link) {
            link.setAttribute('tabindex', '-1');
        });
    };

    var expandNode = function (item) {
        item.setAttribute('aria-expanded', 'true');

        enableTab(item); // Add child links to tab sequence
    };

    var collapseNode = function (item) {
        item.setAttribute('aria-expanded', 'false');

        disableTab(item); // Remove child links from tab sequence
    };

    var isExpanded = function (item) {
        return item.getAttribute('aria-expanded') === 'true';
    };

    var isCollapsed = function (item) {
        return item.getAttribute('aria-expanded') === 'false';
    };

    var isEndNode = function (item) {
        // Doesn't have any children nodes
        return !item.hasAttribute('aria-expanded');
    };

    var unselectNode = function (item) {
        item.setAttribute('aria-selected', 'false');
    };

    var getFocusableItem = function (item) {
        var focusableItem;

        if (!item.hasAttribute('tabindex')) {
            focusableItem = item.querySelector('a[href]');
        } else {
            focusableItem = item;
        }

        return focusableItem;
    };

    var selectNode = function (item) {
        var focusableItem = getFocusableItem(item);

        focusableItem.focus();
        focusableItem.setAttribute('aria-selected', 'true');
    };

    var selectChildNode = function (item) {
        var firstChildNode = item.querySelector('[role="group"]').firstElementChild;

        unselectNode(item);
        selectNode(firstChildNode);
    };

    var selectParentNode = function (item) {
        var parentNode = getClosestParentTreeElement(item);

        unselectNode(item);
        selectNode(parentNode);
    };

    var selectNextNode = function (item) {
        var next = item.nextElementSibling;

        if (!next) {
            next = item.parentElement.firstElementChild;
        }

        unselectNode(item);
        selectNode(next);
    };

    var selectPreviousNode = function (item) {
        var previous = item.previousElementSibling;

        if (!previous) {
            previous = item.parentElement.lastElementChild;
        }

        unselectNode(item);
        selectNode(previous);
    };

    var goToUrl = function (item) {
        window.location.href = item.querySelector('a').getAttribute('href');
    };

    var disableTitle = function (title) {
        title.classList.remove('toc-section-title--active');
        title.classList.add('toc-section-title');
    };

    var enableTitle = function (title) {
        title.classList.remove('toc-section-title');
        title.classList.add('toc-section-title--active');
    };

    var toggleExpand = function (evt) {
        var parentTreeitem = getClosestParentTreeElement(evt.target);
        var title = parentTreeitem.firstElementChild;
        var expanded = parentTreeitem.getAttribute('aria-expanded') === 'true';

        if (expanded) {
            collapseNode(parentTreeitem);
            disableTitle(title);
        }

        if (!expanded) {
            expandNode(parentTreeitem);
            enableTitle(title);
        }
    };

    var onKeydown = function (evt) {
        var key = evt.which || evt.keyCode;
        var currentTreeitem = getClosestTreeElement(evt.target);

        switch (key) {
            case 32: // space
                evt.preventDefault(); // Prevent scrolling
                goToUrl(currentTreeitem);
                break;
            case 37: // left
                if (isCollapsed(currentTreeitem) || isEndNode(currentTreeitem)) {
                    selectParentNode(currentTreeitem);
                } else {
                    collapseNode(currentTreeitem);
                }
                break;
            case 38: // up
                evt.preventDefault(); // Prevent scrolling
                selectPreviousNode(currentTreeitem);
                break;
            case 39: // right
                if (isExpanded(currentTreeitem)) {
                    selectChildNode(currentTreeitem);
                } else {
                    expandNode(currentTreeitem);
                }
                break;
            case 40: // down
                evt.preventDefault(); // Prevent scrolling
                selectNextNode(currentTreeitem);
                break;
            default:
                break;
        }
    };

    var onTreeFocus = function (evt) {
        var tree = evt.target;
        var firstChildNode = tree.querySelector('[role="treeitem"]');
        var currentSelectedNode = tree.querySelector('[role="treeitem"][aria-selected="true"]');

        if (currentSelectedNode) {
            selectNode(currentSelectedNode);
        } else {
            selectNode(firstChildNode);
        }
    };

    treeview.addEventListener('focus', onTreeFocus, false); // Handle viewtree focus through tab

    treeitems.map(function (treeitem) {
        treeitem.addEventListener('keydown', onKeydown, false);
    });

    tocSectionTitle.map(function (title) {
        title.addEventListener('click', toggleExpand, false);
    });
}());
