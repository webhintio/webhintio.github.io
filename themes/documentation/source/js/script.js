window.onload = function () {
    var toggleDocDropdown = function (e) {
        e.preventDefault();
        document.getElementById("doc-dropdown-content").classList.toggle("show");
    };
    var toggleAboutDropdown = function (e) {
        e.preventDefault();
        document.getElementById("about-dropdown-content").classList.toggle("show");
    };
    var registerEvent = function () {
        document.getElementById('doc').addEventListener('click', toggleDocDropdown, false);
        document.getElementById('about').addEventListener('click', toggleAboutDropdown, false);
    };

    registerEvent();
};
