const getFirst = function (pattern) {
    return [{
        active: false,
        page: 1,
        url: pattern.replace('pageId', 1)
    }];
};

const getLast = function (total, pattern) {
    return [{
        active: false,
        page: total,
        url: pattern.replace('pageId', total)
    }];
};

const firstItems = function (current, total, pattern) {
    const pages = [];
    const block = [];
    const max = Math.min(total, 5);

    for (let i = 1; i <= max; i++) {
        block.push({
            active: i === current,
            page: i,
            url: pattern.replace('pageId', i)
        });
    }
    pages.push(block);
    if (max < total) {
        pages.push(getLast(total, pattern));
    }

    return pages;
};

const middlePage = (current, total, pattern) => {
    const pages = [];
    const block = [];
    const max = Math.min(current + 2, total);
    const min = Math.max(current - 2, 1);

    if (min > 1) {
        pages.push(getFirst(pattern));
    }

    for (let i = min; i <= max; i++) {
        block.push({
            active: i === current,
            page: i,
            url: pattern.replace('pageId', i)
        });
    }
    pages.push(block);

    if (max < total) {
        pages.push(getLast(total, pattern));
    }

    return pages;
};

const lastItems = function (current, total, pattern) {
    const pages = [];
    const block = [];
    const min = Math.max(1, total - 4);

    if (min > 1) {
        pages.push(getFirst(pattern));
    }

    for (let i = min; i <= total; i++) {
        block.push({
            active: i === current,
            page: i,
            url: pattern.replace('pageId', i)
        });
    }
    pages.push(block);

    return pages;
};

module.exports = {
    generate: (current, total, pattern, client, options) => {
        const context = {
            hidePagination: true,
            next: null,
            pages: [],
            pattern,
            prev: null
        };

        if (!options) {
            options = client; //eslint-disable-line no-param-reassign
        }

        if (!total || total <= 1) {
            return context;
        }

        context.hidePagination = false;

        if (current !== 1) {
            const previousPage = current - 1;

            context.prev = {
                page: previousPage,
                url: pattern.replace('pageId', previousPage)
            };
        }

        if (current !== total) {
            const nextPage = current + 1;

            context.next = {
                page: nextPage,
                url: pattern.replace('pageId', nextPage)
            };
        }

        let pages;

        if (current <= 5) {
            pages = firstItems(current, total, pattern);
            context.pages = pages;

            return context;
        }

        if (current >= total - 5) {
            pages = lastItems(current, total, pattern);
            context.pages = pages;

            return context;
        }

        if (current > 5) {
            pages = middlePage(current, total, pattern);
            context.pages = pages;

            return context;
        }

        return context;
    }
};
