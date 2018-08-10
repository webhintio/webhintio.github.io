/* global hexo */

const ejs = require('ejs');
const utils = require('../helper/utils');

hexo.extend.renderer.register('ejs', 'html', (data, options) => {
    options.filename = data.path;
    options.utils = utils;
    options.query = '';

    return ejs.render(data.text, options);
}, true);
