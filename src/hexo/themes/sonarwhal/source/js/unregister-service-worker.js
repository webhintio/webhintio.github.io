/* eslint-env browser */
/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand, no-continue */
(function () {
    'use strict';

    if ('serviceWorker' in navigator) { // In case browser doesn't support service worker.
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (var i = 0; i < registrations.length; i++) {
                registrations[i].unregister();
            }
        });
    }
}());
