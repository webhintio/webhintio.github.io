/* global hexo */

const Remarkable = require('remarkable');
const extLink = require('remarkable-extlink');
const toc = require('markdown-toc');
const { stripHTML } = require('hexo-util');

const renderer = function (data) {
    const remarkable = new Remarkable({
        breaks: false,
        highlight(/*str, lang*/) {
            return '';
        },
        html: true,
        linkify: true,
        typographer: true
    });

    remarkable.use(extLink, { host: 'webhint.io' });

    remarkable.use((rmkbl) => {
        rmkbl.renderer.rules.heading_open = function (tokens, idx) { //eslint-disable-line camelcase
            const content = tokens[idx + 1].content;
            const id = toc.slugify(content);
            const level = tokens[idx].hLevel;

            return `<h${level} id=${id}>`;
        };

        rmkbl.renderer.rules.heading_close = function (tokens, idx) { //eslint-disable-line camelcase
            const level = tokens[idx].hLevel;
            const content = tokens[idx - 1].content;
            const id = toc.slugify(content);

            return `<a href="#${id}" class="headerlink" title="${stripHTML(content)}"></a></h${level}>`;
        };
    });

    /* eslint-enable */

    const remarkableText = remarkable.render(data.text);

    return remarkableText;
};

hexo.extend.renderer.register('md', 'html', renderer, true);
