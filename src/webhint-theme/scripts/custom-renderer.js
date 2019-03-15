/* global hexo */
const url = require('url');

const marked = require('marked');
const uslug = require('uslug');
const { stripHTML } = require('hexo-util');

marked.setOptions(hexo.config.marked);

const renderer = new marked.Renderer();

const isExternalLink = (href) => {
    const linkUrl = new url.URL(href, 'https://webhint.io');

    return linkUrl.host !== 'webhint.io';
};

renderer.link = (href, title, text) => {
    return `<a${isExternalLink(href) ? ' target="_blank"' : ''} href="${href}" title="${title}">${text}</a>`;
};

renderer.heading = (text, level) => {
    const id = uslug(text);

    return `<h${level} id=${id}>${text}<a href="#${id}" class="headerlink" title="${stripHTML(text)}"></a></h${level}>`;
};

const hexoRenderer = (data) => {
    return marked(data.text, { renderer });
};

hexo.extend.renderer.register('md', 'html', hexoRenderer, true);
