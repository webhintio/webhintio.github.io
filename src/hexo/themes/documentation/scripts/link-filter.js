/* globals hexo */

hexo.extend.filter.register('before_post_render', (data) => {
    // Find and replace Urls that
    // - is enclosed in parenthesis pairs
    // - doesn't start with `http`, `https` or `ftp`
    // - endes with `.md`
    // Examples:
    // - (../rules/how-to-interact-with-other-services.md) => (../rules/how-to-interact-with-other-services.html)
    // - (../index.md#rule-configuration) => (../index.html#rule-configuration)
    const mdUrlRegex = /\((?!http|https|ftp)([^(|)]+\.md)[^(|)]*\)/g;
    let match;

    while ((match = mdUrlRegex.exec(data.content)) !== null) {
        const matchMdUrl = match[0];
        const matchHtmlUrl = matchMdUrl.replace('.md', '.html');

        data.content = data.content.replace(matchMdUrl, matchHtmlUrl);
    }
});
