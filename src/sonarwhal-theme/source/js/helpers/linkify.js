/* eslint-env browser */
/* eslint-disable no-var, prefer-template, object-shorthand */

var Handlebars;

if (typeof module === 'object' && module.exports) {
    Handlebars = require('handlebars');
} else {
    Handlebars = window.Handlebars;
}

(function (hbs) {
    var linkify = function (msg) {
        var regex = /(https?:\/\/[a-zA-Z0-9.\\/?:@\-_=#]+\.[a-zA-Z0-9&.\\/?:@-_=#]*)\s[a-zA-Z]/g;
        // Modified use of regular expression in https://stackoverflow.com/a/39220764
        // Should match:
        // jQuery@2.1.4 has 2 known vulnerabilities (1 medium, 1 low). See https://snyk.io/vuln/npm:jquery for more information.
        // AngularJS@1.4.9 has 3 known vulnerabilities (3 high). See https://snyk.io/vuln/npm:angular for more information.
        // Shouldn't match (shortened url):
        // File https://www.odysys.com/ … hedule-Your-Demo-Now.png could be around 37.73kB (78%) smaller.
        var match = regex.exec(msg);
        var escapedMsg = hbs.Utils.escapeExpression(msg);

        if (!match) {
            return escapedMsg;
        }

        var urlMatch = match.pop();
        var escapedUrlMatch = hbs.Utils.escapeExpression(urlMatch);
        var newMsg = escapedMsg.replace(escapedUrlMatch, '<a href="' + urlMatch + '">' + escapedUrlMatch + '</a>');

        return new hbs.SafeString(newMsg);
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = { linkify: linkify };
    } else {
        hbs.registerHelper('linkify', linkify);
    }
}(Handlebars));
