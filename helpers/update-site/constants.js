const CONTENT = 'src/content';
const THEME = 'src/webhint-theme';
const USER_GUIDE = `${CONTENT}/docs/user-guide`;
const REPOSITORY = require('../mktemp')();

const dirs = {
    /** About documentation destination directory. */
    ABOUT: `${CONTENT}/about`,
    /** Destination directory for the content. */
    CONTENT,
    /** Contributor guide documentation destination directory. */
    CONTRIBUTOR_GUIDE: `${CONTENT}/docs/contributor-guide`,
    /** Hexo _data folder */
    DATA: `${CONTENT}/_data`,
    /** Hints documentation directory. */
    HINTS_DOC: `${USER_GUIDE}/hints`,
    /** Hint repository packages directory. */
    HINT_PACKAGES: `${REPOSITORY}/packages`,
    /** Temporal directory to clone the repository. */
    REPOSITORY,
    /** Images for the HTML Formatter. */
    SCAN_IMAGES: `${THEME}/source/images/scan`,
    /** EJS partial views compiled for the HTML Formatter. */
    SCAN_PARTIALS: `${THEME}/source/js/partials`,
    /** Scripts for the HTML Formatter. */
    SCAN_SCRIPTS: `${THEME}/source/js/scan`,
    /** Styles necessary for the HTML Formatter. */
    SCAN_STYLES: `${THEME}/source/core/css/scan`,
    /** Partial views for the HTML Formatter. */
    SCAN_TEMPLATES: `${THEME}/layout/partials/scan`,
    /** User guide documentation destination directory. */
    USER_GUIDE
};

module.exports = {
    /** Repository to clone. */
    REPO_URL: 'https://github.com/webhintio/hint.git',
    /** Directories used to get the documentation from the hint repository. */
    dirs
};
