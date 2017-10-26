/* globals hexo */

hexo.extend.filter.register('before_post_render', (data) => {
    // Find and replace Urls that
    // - is enclosed in parenthesis pairs
    // - doesn't start with `http`, `https` or `ftp`
    // - endes with `.md`
    const mdUrlRegex = /\((?!http|https|ftp)([^(|)]+\.md)[^(|)]*\)/g;
    let match;

    while ((match = mdUrlRegex.exec(data.content)) !== null) {
        const matchMdUrl = match[0];
        let matchHtmlUrl = matchMdUrl.replace(/(?:\/index)?.md/g, '/');
        // Examples:
        // - (../rules/how-to-interact-with-other-services.md) => (../rules/how-to-interact-with-other-services/)
        // - (../index.md#rule-configuration) => (../#rule-configuration)

        if (!data.source.includes('index.md')) {
            // Due to the one more directory level added after converting permalinks.
            // i.e. ../faq.md => ../faq/index.html
            // If we want to back out from faq to go to other pages, we need to back out one more time.
            matchHtmlUrl = matchHtmlUrl.replace(/\((.*?)\)/g, '(../$1)');
        }

        data.content = data.content.replace(matchMdUrl, matchHtmlUrl);
    }
});
