/* eslint-env browser */
/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand, no-continue */
window.onload = function () {
    var toggleDocDropdown = function (e) {
        e.preventDefault();
        document.getElementById('submenu-docs').style.display = 'block';
    };
    var toggleAboutDropdown = function (e) {
        e.preventDefault();
        document.getElementById('submenu-about').style.display = 'block';
    };
    var registerEvent = function () {
        document.getElementById('docs').addEventListener('click', toggleDocDropdown, false);
        document.getElementById('about').addEventListener('click', toggleAboutDropdown, false);
    };

    registerEvent();
};
