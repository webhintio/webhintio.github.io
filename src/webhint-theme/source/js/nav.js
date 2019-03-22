//nav menu
(function () {
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
        setAttribute(subItems, 'hidden', '');
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
            evt.currentTarget.parentElement.querySelector('.navbar__submenu').removeAttribute('hidden');
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
        var expandedMenus = document.querySelectorAll('.navbar__submenu:not([hidden])');

        if (expandedMenus.length === 0) {
            return;
        }

        for (var j = 0, lj = expandedMenus.length; j < lj; j++) {
            var expandedMenu = expandedMenus[j];

            if (!insideContainer(target, expandedMenu)) {
                expandedMenu.setAttribute('hidden', '');
                expandedMenu.parentElement.querySelector('[aria-expanded="true"]').removeAttribute('aria-expanded');
            }
        }
    }, true);

    /* Mobile Nav */
    var navBar = document.querySelector('.nav .nav__navbar');
    var searchBar = document.querySelector('.nav .nav-bar--container');
    var mobileButtons = document.querySelector('.nav-bar--mobile-buttons');
    var closeButton = document.querySelector('.mobile-close-button');

    var menuClass = 'mobile-nav-button';
    var searchClass = 'mobile-search-button';

    var mobileNavClickHandler = function (evt) {
        evt.stopPropagation();
        var target = evt.target;

        if (target.classList.contains(menuClass)) {
            navBar.classList.toggle('show');
        }

        if (target.classList.contains(searchClass)) {
            searchBar.classList.toggle('show');
            if (searchBar.classList.contains('show')) {
                document.getElementById('search-input').focus();
            }
        }
    };

    var closeMenu = function () {
        navBar.classList.remove('show');
    };

    var closeSearch = function () {
        searchBar.classList.remove('show');
    };

    mobileButtons.addEventListener('click', mobileNavClickHandler, false);
    document.addEventListener('click', closeMenu, false);
    closeButton.addEventListener('click', closeSearch, false);
}());
