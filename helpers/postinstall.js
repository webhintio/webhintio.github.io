/*
 * Post Install Script
 * Copies a set of files from the `@hint/artwork` asset repository into this one
 */
try {
    const shell = require('shelljs');
    const mkdirp = require('mkdirp');

    const baseSrcPath = 'node_modules/@hint/artwork/src/';
    const baseTargetPath = 'src/webhint-theme/source/images/';

    const fileSrcAndTargets = {
        'other/confused/confused.svg': 'nellie-confused.svg',
        'other/developing/developing.svg': 'developer-nellie.svg',
        'other/octocat/octocat_1.svg': 'nellie-octocat.svg',
        'other/searching/searching.svg': 'nellie-searching.svg',
        'other/sunglasses/sunglasses.svg': 'nellie-customizable.svg',
        'other/working/working.svg': 'nellie-construction.svg'
    };

    mkdirp.sync(baseTargetPath);

    Object.entries(fileSrcAndTargets).forEach((entry) => {
        const srcPath = entry[0];
        const targetPath = entry[1];

        shell.cp(`${baseSrcPath}${srcPath}`, `${baseTargetPath}${targetPath}`);
    });
} catch (e) {
    console.log(`Couldn't copy images, probably install in "--production" mode`);
}
