/* globals hexo */
const cheerio = require('cheerio');
const updateRelAttribute = (data) => {
    const $ = cheerio.load(data.content, { decodeEntities: false });

    $('a').each(function () {
        if ($(this).attr('href') && $(this).attr('rel') === 'external') { //eslint-disable-line no-invalid-this
            $(this).attr('rel', 'noopener noreferrer'); //eslint-disable-line no-invalid-this
        }
    });

    data.content = $.html();
};

hexo.extend.filter.register('after_post_render', updateRelAttribute, 11);
// We need to modify the string genereated from a hexo default filter : https://github.com/hexojs/hexo/blob/master/lib/plugins/filter/after_post_render/external_link.js.
// So we have to execute `updateRelAttribute` after it runs.
// The default priority is 10, so we set `updateRelAttribute` as 11 to make sure it always runs the last.
