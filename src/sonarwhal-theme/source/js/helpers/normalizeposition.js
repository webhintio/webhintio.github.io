/* globals Handlebars */

(function () {
    var normalizePosition = function (position) {
        if (!position || parseInt(position) === -1) {
            return '';
        }

        return ':' + position;
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = { normalizePosition: normalizePosition };
    } else {
        Handlebars.registerHelper('normalizePosition', normalizePosition);
    }
}());
