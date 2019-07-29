/* global hexo */
const url = require('url');

const stripIndent = require('strip-indent');
const hljs = require('highlight.js');
const marked = require('marked');
const uslug = require('uslug');
const { stripHTML } = require('hexo-util');

marked.setOptions(hexo.config.marked);

const renderer = new marked.Renderer();

const isExternalLink = (href) => {
    const linkUrl = new url.URL(href, 'https://webhint.io');

    return linkUrl.host !== 'webhint.io';
};

const escapeMap = {
    '"': '&quot;',
    '&': '&amp;',
    "'": '&#39;', // eslint-disable-line quotes
    '<': '&lt;',
    '>': '&gt;'
};

const escapeForHTML = (input) => {
    return input.replace(/([&<>'"])/g, (char) => {
        return escapeMap[char];
    });
};

hljs.configure({ classPrefix: 'hljs-' });

renderer.code = (code, lang) => {
    /*
     * Code based in this article: https://shuheikagawa.com/blog/2015/09/21/using-highlight-js-with-marked/
     * and in how hexo generate the code block.
     */
    const stripCode = stripIndent(code);
    const validLang = !!(lang && hljs.getLanguage(lang));
    const result = (validLang ? hljs.highlight(lang, stripCode).value : escapeForHTML(stripCode))
        .replace(/{/g, '&#123;')
        .replace(/}/g, '&#125;');

    return `<figure class="highlight${lang ? ` ${lang}` : ''}"><table><tr><td class="code"><pre>${result}</pre></td></tr></table></figure>`;
};

renderer.link = (href, title, text) => {
    return `<a${isExternalLink(href) ? ' target="_blank"' : ''} href="${href}" ${title ? ` title="${title}"` : ''}>${text}</a>`;
};

renderer.heading = (text, level) => {
    const id = uslug(stripHTML(text));

    return `<h${level} id=${id}>${text}<a href="#${id}" class="headerlink" title="${stripHTML(text)}"></a></h${level}>`;
};

const hexoRenderer = (data) => {
    return marked(data.text, { renderer });
};

hexo.extend.renderer.register('md', 'html', hexoRenderer, true);
