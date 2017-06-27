/* eslint-disable no-var, prefer-template, strict, prefer-arrow-callback, object-shorthand */
/* eslint-env browser */
(function () {
    'use strict';

    if (!window.matchMedia) {
        return;
    }

    var active = false;
    var anchorTops = document.querySelectorAll('.anchor-top');

    if (anchorTops.length === 0) {
        return;
    }

    var anchors = [];

    for (var i = 0; i < anchorTops.length; i++) {
        var height = anchorTops[i].dataset.scroll || 2;

        height = parseInt(height, 10);
        anchors.push({
            element: anchorTops[i],
            height: height
        });
    }

    var queued = false;
    var onScroll = function () {
        var scroll = window.scrollY / window.innerHeight;

        anchors.forEach(function (anchor) {
            if (scroll >= anchor.height) {
                anchor.element.removeAttribute('hidden');
            } else {
                anchor.element.setAttribute('hidden', '');
            }
        });
        queued = false;
    };

    var hideAnchors = function () {
        anchors.forEach(function (anchor) {
            anchor.element.setAttribute('hidden', '');
        });
    };

    var queueScroll = function () {
        if (!active) {
            return;
        }

        if (!queued) {
            queued = true;
            requestAnimationFrame(onScroll);
        }
    };

    var mq = window.matchMedia('(min-width: 48em)');

    if (mq.matches) {
        active = true;
        window.addEventListener('scroll', queueScroll, false);
    }

    var onChangeSize = function (mqe) {
        if (mqe.matches) {
            active = true;
            queueScroll();
            window.addEventListener('scroll', queueScroll, false);
        } else {
            active = false;
            hideAnchors();
            window.removeEventListener('scroll', queueScroll, false);
        }
    };

    mq.addListener(onChangeSize);
}());
