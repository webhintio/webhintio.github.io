/* globals hexo */

hexo.extend.filter.register('before_post_render', (data) => {
    // Find and replace Urls that
    // - is enclosed in parenthesis pairs
    // - doesn't start with `http`, `https` or `ftp`
    // - endes with `.md`
    const mdUrlRegex = /\((?!(http|https|ftp):)([^(|)]+\.md)[^(|)]*\)/g;
    const hintUrlRegex = /(?:..\/)*(hint-.*)\/README/i;
    const isHintPage = data.source.includes('hints');
    let match;
    const docLinkRegex = /\/(docs\/)[^.]*(\.md)/g;

    /*
     * Replace links to other documentation files.
     * i.e:
     * For packages with multiple hints, we should have
     * links to each hints in the README.md
     * Those links will be transform:
     *
     * ./docs/hint-name.md => ./hint-name
     */
    data.content = data.content.replace(docLinkRegex, (link, docsString, extensionString) => {
        return link.replace(docsString, '')
            .replace(extensionString, '');
    });

    while ((match = mdUrlRegex.exec(data.content)) !== null) {
        const matchMdUrl = match[0];
        let matchHtmlUrl = matchMdUrl.replace(/(?:\/index)?.md/g, '/');

        // Examples:
        // - (../hints/how-to-interact-with-other-services.md) => (../hints/how-to-interact-with-other-services/)
        // - (../index.md#hint-configuration) => (../#hint-configuration)

        if (!data.source.includes('index.md')) {
            // Due to the one more directory level added after converting permalinks.
            // i.e. ../faq.md => ../faq/index.html
            // If we want to back out from faq to go to other pages, we need to back out one more time.
            matchHtmlUrl = matchHtmlUrl.replace(/\((.*?)\)/g, '(../$1)');
        }

        // ../../../../hint-axe/README/ => hint-axe/
        const matchHintUrl = matchHtmlUrl.match(hintUrlRegex);
        const newUrl = isHintPage && matchHintUrl ? `(${matchHintUrl.pop()}/)` : matchHtmlUrl;

        data.content = data.content.replace(matchMdUrl, newUrl);

        // Offset `lastIndex` due to the length change after string replacement:
        //
        // Before replacement: ... (../../../../hint-amp-validator/README.md)...
        // The index to start next match (lastIndex): 619
        //
        // After replacement: ... (hint-amp-validator/) ...
        // The actual index to start the next match: 619 - (before.length - after.length) = 598

        mdUrlRegex.lastIndex -= matchMdUrl.length - newUrl.length;
    }
});
