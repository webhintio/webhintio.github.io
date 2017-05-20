/* eslint-env browser */
/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand, no-continue */
//nav menu
(function () {
    'use strict';

    var sectionItems = document.querySelectorAll('.navbar__navitem .navitem__button.expandable');
    var items = document.querySelectorAll('.navbar__navitem .navbar__submenu');

    var setAttribute = function (collection, attribute, value) {
        for (var i = 0; i < collection.length; i++) {
            collection[i].setAttribute(attribute, value);
        }
    };

    var collapseAll = function (root) {
        var secItems;
        var subItems;

        if (!root) {
            secItems = sectionItems;
            subItems = items;
        } else {
            secItems = root.querySelectorAll(root.tagName.toLowerCase() + ' .navbar__navitem .navitem__button');
            subItems = root.querySelectorAll(root.tagName.toLowerCase() + ' .navbar__navitem .navbar__submenu');
        }

        setAttribute(secItems, 'aria-expanded', 'false');
        setAttribute(subItems, 'aria-hidden', 'true');
    };

    var isParentExpanded = function (ele) {
        var element = ele;
        var expanded = document.querySelector('.navbar__navitem .navitem__button[aria-expanded="true"]');

        if (!expanded) {
            return false;
        }

        expanded = expanded.parentElement;
        var isCollapsed = true;

        while (isCollapsed) {
            if (element === expanded) {
                isCollapsed = false;
                break;
            } else if (element.parentElement) {
                element = element.parentElement;
            } else {
                break;
            }
        }

        return !isCollapsed ? element : null;
    };

    var toggleSection = function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var expanded = evt.currentTarget.getAttribute('aria-expanded') === 'true';

        var expandedParent = isParentExpanded(evt.currentTarget.parentElement);

        if (expanded || !expandedParent) {
            collapseAll();
        } else if (expandedParent) {
            collapseAll(expandedParent);
        }

        if (!expanded) {
            evt.currentTarget.parentElement.querySelector('.navbar__submenu').removeAttribute('aria-hidden');
            evt.currentTarget.setAttribute('aria-expanded', 'true');
        }
    };

    var toggleKeydownSection = function (evt) {
        var key = evt.which || evt.keyCode;

        if (key !== 32 && key !== 13) {
            return;
        }

        toggleSection(evt);
    };

    for (var i = 0; i < sectionItems.length; i++) {
        sectionItems[i].addEventListener('click', toggleSection, false);
        sectionItems[i].addEventListener('keydown', toggleKeydownSection, false);
    }

    document.addEventListener('click', function () {
        collapseAll();
    });

    var insideContainer = function (item, container) {
        var result = false;

        while (item) {
            if (item === container) {
                result = true;
                break;
            }

            item = item.parentElement; //eslint-disable-line no-param-reassign
        }

        return result;
    };

    document.addEventListener('focus', function (evt) {
        var target = evt.target;
        var expandedMenus = document.querySelectorAll('.navbar__submenu:not([aria-hidden="true"])');

        if (expandedMenus.length === 0) {
            return;
        }

        for (var j = 0, lj = expandedMenus.length; j < lj; j++) {
            var expandedMenu = expandedMenus[j];

            if (!insideContainer(target, expandedMenu)) {
                expandedMenu.setAttribute('aria-hidden', 'true');
                expandedMenu.parentElement.querySelector('[aria-expanded="true"]').removeAttribute('aria-expanded');
            }
        }
    }, true);

    /* Mobile Nav */
    var navBar = document.querySelector('.nav .nav__navbar');
    var navIconMobile = document.querySelector('.header__toggle');

    var mobileClickHandler = function (evt) {
        evt.stopPropagation();
        navBar.classList.toggle('show');
    };

    navIconMobile.addEventListener('click', mobileClickHandler, false);
    document.addEventListener('click', function () {
        navBar.classList.remove('show');
    });
}());
