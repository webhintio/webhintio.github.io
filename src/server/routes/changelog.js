const fs = require('fs');
const path = require('path');

const changelog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'content', '_data', 'changelog.json'), 'utf-8')); // eslint-disable-line no-sync
const maxPackagesPerPage = 20;

const paginateChangelog = () => {
    let acc = 0;
    const pages = [];
    let page = [];

    pages.push(page);
    changelog.forEach((changelogItem) => {
        let newChangelogItem = {
            date: changelogItem.date,
            dateString: changelogItem.dateString,
            packages: {}
        };

        page.push(newChangelogItem);

        const packages = Object.entries(changelogItem.packages);

        packages.forEach(([packageName, packageContent]) => {
            if (acc >= maxPackagesPerPage) {
                acc = 0;
                page = [];
                pages.push(page);

                newChangelogItem = {
                    date: changelogItem.date,
                    dateString: changelogItem.dateString,
                    packages: {}
                };

                page.push(newChangelogItem);
            }

            newChangelogItem.packages[packageName] = packageContent;
            acc++;
        });
    });

    return pages;
};

const changelogPaginated = paginateChangelog();
const total = changelogPaginated.length;
const pattern = '/about/changelog/pageId';

const getPageInfo = (pageOneBase) => {
    let page = pageOneBase - 1;

    if (page >= total) {
        page = total - 1;
    } else if (page < 0) {
        page = 0;
    }

    return {
        changelog: changelogPaginated[page],
        page: {
            description: 'Check all the changes in the different webhint versions',
            version: changelog[0].version
        },
        pagination: {
            currentPage: pageOneBase,
            pattern,
            totalPages: total
        }
    };
};

const configure = (app) => {
    app.get('/about/changelog', (req, res) => {
        return res.render('changelog', getPageInfo(1));
    });

    app.get('/about/changelog/:page', (req, res) => {
        const page = parseInt(req.params.page, 10) || 1;

        return res.render('changelog', getPageInfo(page));
    });
};

module.exports = configure;
