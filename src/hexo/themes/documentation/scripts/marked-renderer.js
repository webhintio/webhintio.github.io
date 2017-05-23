/* globals hexo */
const util = require('hexo-util');

const stripHTML = util.stripHTML;
const rControl = /[\u0000-\u001f]/g;
const rSpecial = /[\s~`!@#$%^&*()_+=[\]{}|\\;:"'<>,.?/]+/g;

const checkString = (str) => {
    if (typeof str !== 'string') {
        throw new TypeError('str must be a string!');
    }
};

const escapeRegExp = (str) => {
    checkString(str);

    // http://stackoverflow.com/a/6969486
    return str.replace(/[[\]/{}()*+?.\\^$|]/g, '\\$&');
};

const slugize = (str, options = {}) => {
    checkString(str);

    const separator = options.separator || '';
    const escapedSep = escapeRegExp(separator);

    let result = str
        .replace(/&lt;/g, '')
        .replace(/&gt;/g, '')
        // Remove control characters
        .replace(rControl, '')
        // Replace special characters
        .replace(rSpecial, separator);

    if (escapedSep) {
        // Remove continous separators
        result = result.replace(new RegExp(`${escapedSep}{2,}`, 'g'), separator)
            // Remove prefixing and trailing separtors
            .replace(new RegExp(`^${escapedSep}+|${escapedSep}+$`, 'g'), '');
    }

    switch (options.transform) {
        case 1:
            return result.toLowerCase();

        case 2:
            return result.toUpperCase();

        default:
            return result;
    }
};
const anchorId = (str, transformOption) => {
    return slugize(str.trim(), {
        separator: '',
        transform: transformOption
    });
};

hexo.markedRenderer = {
    heading(text, level) {
        const transformOption = this.options.modifyAnchors;
        let id = anchorId(stripHTML(text), transformOption);
        const headingId = this._headingId;

        // Add a number after id if repeated
        if (headingId[id]) {
            id += `-${headingId[id]++}`;
        } else {
            headingId[id] = 1;
        }

        // add headerlink
        return `<h${level} id="${id}"><a href="#${id}" class="headerlink" title="${stripHTML(text)}"></a>${text}</h${level}>`;
    }
};
