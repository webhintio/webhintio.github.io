/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand */
/* eslint-env browser */
(function () {
    'use strict';

    var createTabControl = function (element) {
        var tabList = [].slice.call(element.querySelectorAll('[role="tab"]'));
        var tabPanels;

        var deselectAll = function () {
            tabPanels.forEach(function (panel) {
                panel.setAttribute('hidden', '');
            });
            tabList.forEach(function (tab) {
                tab.setAttribute('aria-selected', 'false');
            });
        };

        var selectTab = function (tab) {
            deselectAll();
            tab.setAttribute('aria-selected', 'true');
            tab.focus();
            var panel = document.getElementById(tab.getAttribute('aria-controls'));

            panel.removeAttribute('hidden');
        };

        var tabClick = function (e) {
            selectTab(e.currentTarget);
            e.preventDefault();
        };

        var selectNext = function (tab) {
            var index = tabList.indexOf(tab);

            index++;
            if (index >= tabList.length) {
                index = 0;
            }

            selectTab(tabList[index]);
        };

        var selectPrevious = function (tab) {
            var index = tabList.indexOf(tab);

            index--;
            if (index < 0) {
                index = tabList.length - 1;
            }

            selectTab(tabList[index]);
        };

        var keydown = function (e) {
            var tab = e.currentTarget;

            switch (e.which) {
                case 37:
                case 38:
                    // left, up
                    selectPrevious(tab);
                    break;
                case 39:
                case 40:
                    // right, down
                    selectNext(tab);
                    break;
                default:
                    break;
            }
        };

        tabPanels = tabList.map(function (tab, index) {
            var tabPanel = document.querySelector('#' + tab.getAttribute('aria-controls'));

            if (index === 0) {
                tab.setAttribute('aria-selected', 'true');
            } else {
                tabPanel.setAttribute('hidden', '');
            }
            tab.addEventListener('click', tabClick, false);
            tab.addEventListener('keydown', keydown, false);

            return tabPanel;
        });
    };

    //KEYBOARD HANDLING

    var tabs = [].slice.call(document.querySelectorAll('[role="tablist"]'));

    tabs.forEach(function (tab) {
        createTabControl(tab);
    });
}());
