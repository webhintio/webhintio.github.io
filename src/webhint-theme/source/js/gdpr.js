(function () {
    /** Creates a cookie. Code based on https://www.quirksmode.org/js/cookies.html */
    var createCookie = function (name, value, days) {
        var expires = '';

        if (days) {
            var date = new Date();

            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }

        document.cookie = name + '=' + value + expires + '; path=/';
    };

    /** Reads a cookie. Code based on https://www.quirksmode.org/js/cookies.html */
    var readCookie = function (name) {
        var nameEQ = name + '=';
        var ca = document.cookie.split(';');

        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];

            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }

            if (c.indexOf(nameEQ) === 0) {
                return c.substring(nameEQ.length, c.length);
            }
        }

        return null;
    };

    var hideDisclaimer = function () {
        var ele = document.getElementById('disclaimer');

        ele.setAttribute('hidden', '');
    };

    var consent = readCookie('consent') === 'on';

    document.querySelector('.close')
        .addEventListener('click', hideDisclaimer, false);

    if (consent) {
        // user already gave consent so we start analytics
        hideDisclaimer();
    }

    createCookie('consent', 'on', 30);
}());
