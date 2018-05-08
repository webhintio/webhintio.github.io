/* eslint-env browser */
/* eslint-disable no-var, prefer-template, object-shorthand */
/* globals Handlebars */

(function () {
    var pluralize = function (text, count) {
        return text + (count === 1 ? '' : 's');
    };

    var getLength = function (messages, unit) {
        var length = messages.length;
        var units = pluralize(unit, length);

        return length + ' ' + units;
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = {
            getLength: getLength,
            pluralize: pluralize
        };
    } else {
        Handlebars.registerHelper('getLength', getLength);
        Handlebars.registerHelper('pluralize', pluralize);
    }
}());
