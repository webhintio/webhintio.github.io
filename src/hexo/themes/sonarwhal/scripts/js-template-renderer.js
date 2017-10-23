/* globals hexo */
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

// Use of plugin with modification: https://github.com/jaredly/hexo-renderer-handlebars

const jsTemplateRenderer = function (data, locals) {
    const template = handlebars.compile(data.text);
    const helperDir = path.join(hexo.theme_dir, 'helper');

    const partialDir = path.join(hexo.theme_dir, 'layout', 'partials');
    let partials;

    try {
        partials = fs.readdirSync(partialDir); // eslint-disable-line no-sync
    } catch (e) {
        // if this fails, there just aren't any partials. No problem.
    }

    if (partials) {
        partials.forEach((fname) => {
            const [name, extension] = fname.split('.');

            if (extension !== 'hbs') {
                return;
            }
            let content = fs.readFileSync(path.join(partialDir, fname)).toString() // eslint-disable-line no-sync
                .replace(/(\r?\n)/g, '\\$1'); // Add `\` so that multi-line string is allowed.

            content = content.replace(/({{.*?}})/g, '\\$1'); // Escape `{{...}}` so that it's parsed out during compilation to generate templates in js files.
            content = content.replace(/(')/g, '\\$1'); // Escape `'` so that it won't break in the js file.

            handlebars.registerPartial(name, content);
        });
    }

    let helpers = {};

    try {
        helpers = require(helperDir)(hexo);
        // Note: Helpers still need to be regeistered in the js file before parsing the templates to html.
        // The helpers registered here are only used when interpolating the hbs partials in the js files to templates.
    } catch (e) {
        // no additional helpers available. No problem.
    }

    return template(locals, { helpers });
};

hexo.extend.renderer.register('js', 'js', jsTemplateRenderer, true);
