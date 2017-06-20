/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand */
/* eslint-env browser */
(function () {
    'use strict';

    var testEl = document.createElement('button');

    testEl.setAttribute('type', 'menu');

    var supportDetails = testEl.type === 'menu';

    if (supportDetails) {
        //No need to pollyfill the menu
        return;
    }

    var keyCodes = {
        down: 40,
        enter: 13,
        escape: 27,
        space: 32,
        tab: 9,
        up: 38
    };

    var arraify = function (elements) {
        return [].slice.call(elements);
    };

    var copyAttributes = function (source, target) {
        var attributes = arraify(source.attributes);
        var type = source.getAttribute('type');

        attributes.forEach(function (attribute) {
            var name = type === 'radio' && attribute.name === 'radiogroup' ? 'name' : attribute.name;

            target.setAttribute(name, attribute.nodeValue ? attribute.nodeValue : '');
        });
    };

    var setAriaAttributesInMenu = function (el) {
        var menuId = el.getAttribute('menu');

        el.setAttribute('aria-haspopup', 'true');
        el.setAttribute('aria-owns', menuId);
    };

    var createMenuWrapper = function (el) {
        var menuId = el.getAttribute('menu');
        var wrapper = document.createElement('div');

        wrapper.className = 'wrap-menu-button';
        wrapper.innerHTML = '<ul role="menu" hidden id="' + menuId + '"></ul>';

        return wrapper;
    };

    var createLi = function (originalEle) {
        var li = document.createElement('li'),
            input = document.createElement('input'),
            label = document.createElement('label'),
            inputId = originalEle.getAttribute('id'),
            name = originalEle.getAttribute('label');

        copyAttributes(originalEle, input);
        input.setAttribute('role', 'menuitem' + input.getAttribute('type'));
        input.setAttribute('aria-label', input.getAttribute('label'));

        li.setAttribute('role', 'presentation');

        label.setAttribute('for', inputId);
        label.setAttribute('aria-hidden', 'true');
        label.textContent = name;

        li.appendChild(input);
        li.appendChild(label);

        return li;
    };

    var pollyfillMenu = function (el) {
        setAriaAttributesInMenu(el);
        var menuId = el.getAttribute('menu');
        var menu = document.getElementById(menuId);
        var menuitems = arraify(menu.children);

        var wrapper = createMenuWrapper(el);
        var ulEl = wrapper.querySelector('ul');

        menuitems.forEach(function (item) {
            var liEl = createLi(item);

            ulEl.appendChild(liEl);
        });

        el.parentNode.insertBefore(wrapper, el);
        ulEl.parentNode.insertBefore(el, ulEl);
        wrapper.appendChild(ulEl);
        menu.parentNode.removeChild(menu);
    };

    var findFocus = function (siblings, element) {
        var current = 0;
        var found = false;

        for (var i = 0; i < siblings.length; i++) {
            if (siblings[i] === element) {
                found = true;
                current = i;
                break;
            }
        }
        if (found) {
            return current;
        }

        return -1;
    };

    var collapseAll = function () {
        buttonControls.forEach(function (control) { //eslint-disable-line no-use-before-define
            control.collapse();
        });
    };

    var previousFocusableElement = function (siblings, focus) {
        var currentFocus = focus || document.activeElement;
        var position = findFocus(siblings, currentFocus);

        if (position === -1) {
            console.log('something weird is going on');

            return;
        }

        position++;
        if (position >= siblings.length) {
            position = 0;
        }

        var previous = siblings[position];

        if (previous.disabled) {
            previousFocusableElement(siblings, previous);
        } else {
            siblings[position].focus();
        }
    };

    var nextFocusableElement = function (siblings, focus) {
        var currentFocus = focus || document.activeElement;
        var position = findFocus(siblings, currentFocus);

        if (position === -1) {
            return;
        }

        position--;
        if (position < 0) {
            position = siblings.length - 1;
        }

        var next = siblings[position];

        if (next.disabled) {
            nextFocusableElement(siblings, next);
        } else {
            next.focus();
        }
    };

    var windowClick = function (inputs) {
        return function (evt) {
            var collapse = true;

            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i] === evt.target || inputs[i] === evt.target.control) {
                    collapse = false;
                    inputs[i].focus(); //Safari and FF lose focus when clicking on a radio
                    break;
                }
            }

            if (collapse) {
                collapseAll();
                document.activeElement.blur();
            }
        };
    };

    /**Currently there aren't any browsers that support selfclosing <menuitem /> so they just keep nesting elements
     * <menuitem id="a" />
     * <menuitem id="b" />
     * just becomes
     * <menuitem id="a">
     * 	<menuitem id="b"></menuitem>
     * </menuitem>
     * This function fixes that by automatically adding the closing tag.
     * NOTE: This code only works with menus with 1 deep level
     */
    var fixMenu = function (button) {
        var menu = document.getElementById(button.getAttribute('menu'));
        var innerHTML = menu.innerHTML;
        var menuItemsCount = (innerHTML.match(/<\/menuitem>/gi) || []).length;

        if (menuItemsCount > 1 && menu.children.length === 1) { //Browser doesn't support autoclosing menuitems
            innerHTML = innerHTML.replace(/<\/menuitem>/gi, '').replace(/>/g, '></menuitem>');
        }
        menu.innerHTML = innerHTML;
    };

    var createControl = function (button) {
        fixMenu(button);
        pollyfillMenu(button);

        var menuId = button.getAttribute('aria-owns');
        var menu = document.getElementById(menuId);
        var inputs = arraify(menu.querySelectorAll('input'));
        var firstElement = inputs[0];
        var closeWindow = windowClick(inputs.concat([button])); //Need to add it so we don't close it when checking in windowClick

        var isEnabled = function () {
            return button.getAttribute('disabled') !== '';
        };

        var isExpanded = function () {
            return button.getAttribute('aria-expanded') === 'true';
        };

        var setFocusOnFirstElement = function () {
            firstElement.focus();
        };

        var expand = function () {
            menu.removeAttribute('hidden');
            button.setAttribute('aria-expanded', 'true');
            window.addEventListener('keydown', popupNavigation, true); //eslint-disable-line no-use-before-define
            window.addEventListener('click', closeWindow, true);
            setFocusOnFirstElement();
        };

        var collapse = function () {
            menu.setAttribute('hidden', '');
            button.setAttribute('aria-expanded', 'false');
            window.removeEventListener('keydown', popupNavigation, false); //eslint-disable-line no-use-before-define
            window.removeEventListener('click', closeWindow, true);
        };

        var toggleVisibility = function () {
            if (isExpanded()) {
                collapse();
            } else {
                expand();
            }
        };

        var popupNavigation = function (evt) {
            var key = evt.keyCode;

            // Escape or tab closes the open menu (not handled by default)
            if (isExpanded()) {
                if (key === keyCodes.tab || key === keyCodes.escape) {
                    button.focus();
                    collapse();

                    return;
                }
            }

            // Up Arrow or Down Arrow keys cycle focus through the items in that menu (handled by default if radios)
            if (isExpanded()) {
                if (key === keyCodes.up) {
                    evt.preventDefault();
                    nextFocusableElement(inputs);
                } else if (key === keyCodes.down) {
                    evt.preventDefault();
                    previousFocusableElement(inputs);
                }

                return;
            }
        };

        var buttonNavigation = function (evt) {
            var key = evt.keyCode;

            // Enter, Spacebar, or the up or down arrow keys opens the menu and places focus on the first menu item
            if (!isExpanded()) {
                if (key === keyCodes.enter || key === keyCodes.space || key === keyCodes.up || key === keyCodes.down) {
                    expand();

                    return;
                }
            }

            // Typing a letter (printable character) key moves focus to the next instance of a visible node whose title begins with that printable letter. (not sure we can do this easily)
        };

        button.addEventListener('click', toggleVisibility, true);
        button.addEventListener('keyup', buttonNavigation, true);

        return {
            collapse: collapse,
            expand: expand,
            isEnabled: isEnabled,
            isExpanded: isExpanded
        };
    };

    var buttons = arraify(document.querySelectorAll('button[menu]'));
    var buttonControls = buttons.map(function (button) {
        return createControl(button);
    });
}());
(function pollyfillControl() {
    // MSEdge doesn't support for control attribute for label's so we need to pollyfill it

    'use strict';

    var field = document.createElement('input');

    field.id = 'a';
    document.body.appendChild(field);

    var tempLabel = document.createElement('label');

    tempLabel.setAttribute('for', 'a');
    document.body.appendChild(tempLabel);

    var passes = tempLabel.control === field;

    document.body.removeChild(tempLabel);
    document.body.removeChild(field);

    if (passes) {
        return;
    }

    var labels = [].slice.call(document.querySelectorAll('label'));

    labels.forEach(function (label) {
        var htmlFor = label.htmlFor;

        if (htmlFor) {
            label.control = document.getElementById(htmlFor);
        }
    });
}());
