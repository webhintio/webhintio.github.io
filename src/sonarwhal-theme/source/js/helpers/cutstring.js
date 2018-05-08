/* eslint-env browser */
/* eslint-disable no-var, prefer-template, object-shorthand */
/* globals Handlebars */

(function () {
    var reverseString = function (str) {
        return str.split('').reverse()
            .join('');
    };

    var cutString = function (string, maxLength) {
        var minLength = 0.8 * maxLength;
        var preferredStopChars = /[^a-zA-Z0-9]/g;
        var chunk;

        for (var i = minLength; i < maxLength; i++) {
            // Start looking for preferred stop characters.
            if (preferredStopChars.test(string[i])) {
                chunk = string.slice(0, i);

                break;
            }
        }

        chunk = chunk || string.slice(0, maxLength);

        return chunk;
    };

    // Solution inspired by https://stackoverflow.com/a/10903003
    var shortenString = function (string, maxLength) {
        if (!string || string.length < maxLength * 2) {
            return string;
        }

        var headChunk = cutString(string, maxLength);
        var reverseTailChunk = cutString(reverseString(string), maxLength);
        var tailChunk = reverseString(reverseTailChunk);

        return headChunk + ' … ' + tailChunk;
    };

    var cutCodeString = function (codeString) {
        return shortenString(codeString, 150);
    };

    var cutUrlString = function (urlString) {
        return shortenString(urlString, 25);
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = {
            cutCodeString: cutCodeString,
            cutString: cutString,
            cutUrlString: cutUrlString,
            reverseString: reverseString,
            shortenString: shortenString
        };
    } else {
        Handlebars.registerHelper('cutCodeString', cutCodeString);
        Handlebars.registerHelper('cutString', cutString);
        Handlebars.registerHelper('cutUrlString', cutUrlString);
        Handlebars.registerHelper('shortenString', shortenString);
        Handlebars.registerHelper('reverseString', reverseString);
    }
}());
