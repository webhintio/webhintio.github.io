/* globals hexo */
/* eslint-disable no-invalid-this */

const cheerio = require('cheerio');

const updateRelAttribute = (data) => {
    const $ = cheerio.load(data.content, { decodeEntities: false });

    $('a').each(function () {
        if ($(this).attr('href') && $(this).attr('rel') === 'external') {
            $(this).attr('rel', (i, currentValue) => {
                return [...new Set(['noopener', 'noreferrer'].concat(currentValue.split(' ')))].join(' ');
            });
        }
    });

    data.content = $.html();
};

// We need to modify the string genereated from a hexo default filter:
// https://github.com/hexojs/hexo/blob/6c0fbd0e97ec171606103ac1c60c0658bab6e882/lib/plugins/filter/after_post_render/external_link.js
// So we have to execute `updateRelAttribute` after it runs.
// The default priority is 10, so we set `updateRelAttribute` as 11 to
// make sure it always runs the last.

hexo.extend.filter.register('after_post_render', updateRelAttribute, 11);
