const path = require('path');
const fs = require('fs');

const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const shelljs = require('shelljs');

const Hexo = require('hexo');

const imageExtensions = 'gif,ico,jpg,png,svg';
const dirs = {
    dist: 'docs',
    distCompreseable: 'docs/**/*.{css,html,ico,js,svg,txt,xml,webmanifest}',
    hint: 'node_modules/@hint',
    originalContent: `src/content`,
    src: 'src/webhint-theme',
    tmp: 'themes/webhint',
    tmpContent: 'src/content-replaced',
    tmpImages: `themes/webhint/**/*.{${imageExtensions}}`,
    tmpScanImages: `themes/webhint/source/images/scan/*.*`
};

// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('clean:before', (done) => {
    shelljs.rm('-rf',
        dirs.dist,
        dirs.tmp,
        dirs.tmpContent,
        `${dirs.src}/formatter`);

    done();
});

gulp.task('clean:tmp', (done) => {
    shelljs.rm('-rf', dirs.tmp);

    done();
});

gulp.task('clean:after', (done) => {
    shelljs.rm('-rf',
        `${dirs.tmp}/components`,
        `${dirs.tmp}/core`,
        `${dirs.tmp}/js`,
        `${dirs.tmp}/source/components`,
        `${dirs.tmp}/source/core`,
        `${dirs.tmp}/source/images`,
        `${dirs.tmp}/source/js`,
        `${dirs.tmp}/source/partials`,
        `${dirs.tmp}/static`
    );

    done();
});

gulp.task('copy:formatter', (done) => {
    shelljs.cp('-r', `${dirs.hint}/formatter-html`, `${dirs.src}/formatter`);

    done();
});

gulp.task('copy:robots.txt', (done) => {
    shelljs.cp(`${dirs.src}/source/static/robots.txt`, `${dirs.dist}`);

    done();
});

gulp.task('build:hexo', (done) => {
    const hexo = new Hexo(process.cwd(), { silent: true });

    hexo.init()
        .then(() => {
            return hexo.call('clean');
        })
        .then(() => {
            hexo.extend.filter.unregister('after_render:html', require('hexo/lib/plugins/filter/after_render/meta_generator'));

            return hexo.call('generate');
        })
        .then(done);
});

gulp.task('watch:hexo', (done) => {
    const hexo = new Hexo(process.cwd(), { silent: true });

    hexo.init()
        .then(() => {
            hexo.extend.filter.unregister('after_render:html', require('hexo/lib/plugins/filter/after_render/meta_generator'));

            return hexo.call('generate', { watch: true });
        })
        .then(done);
});

gulp.task('copy:theme', () => {
    return gulp.src([
        `${dirs.src}/**/*`,
        `!${dirs.src}/source/static/robots.txt`
    ])
        .pipe(plugins.changed(dirs.tmp))
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('move:static', () => {
    return gulp.src(`${dirs.tmp}/static/**/*`)
        .pipe(gulp.dest(`${dirs.tmp}/source/static`));
});

gulp.task('move:helpers', () => {
    return gulp.src(`${dirs.tmp}/source/js/helpers/*.js`)
        .pipe(gulp.dest(`${dirs.tmp}/helper`));
});

gulp.task('move:locales', () => {
    return gulp.src(`${dirs.tmp}/js/scan/_locales/**/*`)
        .pipe(gulp.dest(`${dirs.tmp}/source/static/scripts/locales`));
});

gulp.task('optimize:js', () => {
    return gulp.src(`${dirs.tmp}/source/**/*.js`)
        .pipe(plugins.uglifyEs.default())
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('optimize:css', () => {
    return gulp.src(`${dirs.tmp}/source/**/*.css`)
        .pipe(plugins.cleanCss())
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('precompile', (cb) => {
    const precompile = require('./helpers/precompile-ejs');

    precompile(dirs.src, 'source/js/partials', ['scan-result-item', 'category-pass-message', 'scan-error-message', 'scan-expand-all', 'browser-icon', 'check-mark']);
    cb();
});

gulp.task('useref', () => {
    return gulp.src(`${dirs.tmp}/layout/**/*.ejs`)
        .pipe(plugins.useref({
            base: `${dirs.tmp}/source/`,
            searchPath: `${dirs.tmp}/source/`
        }))
        .pipe(plugins.if('*.ejs', gulp.dest(`${dirs.tmp}/layout`)))
        .pipe(plugins.if('!*.ejs', gulp.dest(`${dirs.tmp}/source`)));
});

gulp.task('revfiles', () => {
    return gulp.src([
        `${dirs.tmp}/source/**/*`,
        `!${dirs.tmp}/source/**/*.json`,
        `!**/*.yml`,
        `!**/robots.txt`,
        `!**/sitemap.xml`,
        `!**/sw-reg.js`
    ])
        .pipe(plugins.rev())
        .pipe(plugins.revDeleteOriginal())
        .pipe(gulp.dest(`${dirs.tmp}/source`))
        .pipe(plugins.rev.manifest())
        .pipe(gulp.dest(`${dirs.tmp}`));
});

gulp.task('revreplace:content', () => {
    const manifest = gulp.src(`${dirs.tmp}/rev-manifest.json`);

    return gulp.src(`${dirs.originalContent}/**/*`)
        .pipe(plugins.revReplace({
            manifest,
            modifyUnreved: (unrevedPath) => {
                return unrevedPath.replace('static/images/', 'images/');
            },
            prefix: '/',
            replaceInExtensions: ['.md']
        }))
        .pipe(gulp.dest(dirs.tmpContent));
});

gulp.task('revreplace:theme', () => {
    const manifest = gulp.src(`${dirs.tmp}/rev-manifest.json`);

    return gulp.src([`${dirs.tmp}/**/*`, `!${dirs.tmp}/template/**/*`])
        .pipe(plugins.revReplace({
            manifest,
            modifyUnreved: (unrevedPath) => {
                return unrevedPath.replace('static/images/', 'images/');
            },
            replaceInExtensions: ['.css', '.js', '.json', '.html', '.yml', '.webmanifest', '.ejs']
        }))
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('revreplace:formatter', () => {
    const manifest = gulp.src(`${dirs.tmp}/rev-manifest.json`);

    return gulp.src(`${dirs.tmp}/formatter/dist/src/configs/*`)
        .pipe(plugins.revReplace({
            manifest,
            modifyUnreved: (unrevedPath) => {
                return unrevedPath.replace('static/images/', 'images/');
            },
            replaceInExtensions: ['.json']
        }))
        .pipe(gulp.dest(`${dirs.tmp}/formatter/dist/src/configs/`));
});

gulp.task('optimize:templates', () => {
    const htmlminOptions = {
        caseSensitive: true,
        collapseBooleanAttributes: false,
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
        preserveLineBreak: true,
        removeAttributeQuotes: false,
        removeComments: true,
        removeCommentsFromCDATA: false,
        removeEmptyAttributes: false,
        removeOptionalTags: false,
        removeRedundantAttributes: false
    };

    return gulp.src([`${dirs.tmp}/**/*.ejs`, `!${dirs.tmp}/formatter/**/*`])
        .pipe(plugins.htmlmin(htmlminOptions))
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('move:docimage', () => {
    return gulp.src(`${dirs.originalContent}/**/*.{${imageExtensions}}`)
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('imagemin', () => {
    return gulp.src(dirs.tmpImages)
        .pipe(plugins.imagemin())
        .pipe(gulp.dest(dirs.tmp));
});

const moveImages = () => {
    return gulp.src([dirs.tmpImages, `!${dirs.tmpScanImages}`])
        .pipe(plugins.flatten())
        .pipe(gulp.dest(`${dirs.tmp}/source/static/images`));
};

const moveScanImages = () => {
    return gulp.src(dirs.tmpScanImages)
        .pipe(gulp.dest(`${dirs.tmp}/source/static/images/scan`));
};

gulp.task('move:images', moveImages);
gulp.task('move:scanimages', moveScanImages);
gulp.task('optimize:images', gulp.series('move:docimage', 'imagemin', 'move:images', 'move:scanimages'));

// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('compress:zopfli', () => {
    return gulp.src([dirs.distCompreseable])
        .pipe(plugins.zopfliNode())
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('compress:brotli', () => {
    return gulp.src([dirs.distCompreseable])
        .pipe(plugins.brotli.compress())
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('generate-service-worker', (callback) => {
    const swPrecache = require('sw-precache');

    swPrecache.write(`${dirs.dist}/webhint-worker.js`, {
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 5242880,
        runtimeCaching: [{
            handler: 'networkFirst',
            urlPattern: '/*'
        }],
        staticFileGlobs: [`${dirs.dist}/**/*.{js,html,css,png,jpg,gif,ico,svg,woff,woff2}`],
        stripPrefix: dirs.dist
    }, callback);
});

const transform = (jsonResult) => {
    const result = {};
    const entries = Object.entries(jsonResult);

    for (const [key, value] of entries) {
        result[key.replace(`${dirs.tmp}/source`, '')] = value;
    }

    return result;
};

gulp.task('sri', () => {
    return gulp.src(`${dirs.tmp}/source/**/*.{js,css}`)
        .pipe(plugins.sri({ algorithms: ['sha384'], transform }))
        .pipe(gulp.dest(dirs.tmp));
});

let sriList;

const replaceSRI = (content) => {
    let result = content;

    for (const [file, value] of Object.entries(sriList)) {
        result = result.replace(`${file}"`, `${file}" integrity="${value}" crossorigin="anonymous"`);
    }

    return result;
};

gulp.task('add-sri', () => {
    sriList = JSON.parse(fs.readFileSync(path.join(__dirname, dirs.tmp, 'sri.json'), 'utf8')); //eslint-disable-line no-sync

    return gulp.src(`${dirs.tmp}/**/*.ejs`)
        .pipe(plugins.transform('utf8', replaceSRI))
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('build', gulp.series(
    'clean:before',
    'copy:formatter',
    'precompile',
    'copy:theme',
    'optimize:images',
    'useref',
    'optimize:templates',
    'optimize:js',
    'optimize:css',
    'move:static',
    'move:helpers',
    'move:locales',
    'clean:after',
    'revfiles',
    'revreplace:formatter',
    'revreplace:content',
    'revreplace:theme',
    'sri',
    'add-sri',
    'build:hexo',
    'copy:robots.txt',
    // 'generate-service-worker',
    // TODO: Re-enable pre-compression once supported by GitHub Pages
    //'compress:zopfli',
    //'compress:brotli',
));

gulp.task('default', gulp.series('build'));

gulp.task('watch', gulp.series(['clean:before', 'copy:theme', 'precompile', 'move:docimage', 'move:images', 'useref', 'move:static', 'move:helpers', 'clean:after', 'revfiles', 'revreplace:content', 'revreplace:theme', async () => {
    const hexo = new Hexo(process.cwd(), { silent: true });

    await hexo.init();
    await hexo.call('clean');

    gulp.watch(`${dirs.src}/**/*`, gulp.series(['clean:tmp', 'copy:theme', 'precompile', 'move:docimage', 'move:images', 'useref', 'move:static', 'move:helpers', 'clean:after', 'revfiles', 'revreplace:content', 'revreplace:theme', async () => {
        await hexo.call('generate');
    }, 'generate-service-worker']));

    await hexo.call('generate');

    gulp.src(dirs.dist)
        .pipe(plugins.serverLivereload({
            livereload: true,
            open: true,
            port: 4000
        }));
}, 'generate-service-worker']));
