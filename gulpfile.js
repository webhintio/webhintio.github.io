const path = require('path');
const fs = require('fs');

const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const shelljs = require('shelljs');

const Hexo = require('hexo');

const imageExtensions = 'gif,ico,jpg,png,svg';
const dirs = {
    dist: 'dist',
    distCompreseable: 'dist/**/*.{css,html,ico,js,svg,txt,xml,webmanifest}',
    originalContent: `src/content`,
    src: 'src/sonarwhal-theme',
    tmp: 'src/sonarwhal-theme-optimized',
    tmpContent: 'src/content-replaced',
    tmpImages: `src/sonarwhal-theme-optimized/**/*.{${imageExtensions}}`
};

// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('clean:before', (done) => {
    shelljs.rm('-rf', dirs.dist, dirs.tmp, dirs.tmpContent);

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

gulp.task('build:hexo', (done) => {
    const hexo = new Hexo(process.cwd(), {});

    hexo.init()
        .then(() => {
            return hexo.call('clean');
        })
        .then(() => {
            return hexo.call('generate');
        })
        .then(done);
});

gulp.task('watch:hexo', (done) => {
    const hexo = new Hexo(process.cwd(), {});

    hexo.init()
        .then(() => {
            return hexo.call('generate', { watch: true });
        })
        .then(done);
});

gulp.task('copy:theme', () => {
    return gulp.src(`${dirs.src}/**/*`)
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

gulp.task('optimize:js', () => {
    return gulp.src(`${dirs.tmp}/source/**/*.js`)
        .pipe(plugins.uglify())
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('optimize:css', () => {
    return gulp.src(`${dirs.tmp}/source/**/*.css`)
        .pipe(plugins.cleanCss())
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('precompile', (cb) => {
    const precompile = require('./helpers/precompile-hbs');

    precompile(dirs.tmp, 'source/js/partials', ['scan-result-item', 'category-pass-message', 'scan-error-message']);
    cb();
});

gulp.task('useref', () => {
    return gulp.src(`${dirs.tmp}/layout/**/*.hbs`)
        .pipe(plugins.useref({
            base: `${dirs.tmp}/source/`,
            searchPath: `${dirs.tmp}/source/`
        }))
        .pipe(plugins.if('*.hbs', gulp.dest(`${dirs.tmp}/layout`)))
        .pipe(plugins.if('!*.hbs', gulp.dest(`${dirs.tmp}/source`)));
});

gulp.task('revfiles', () => {
    return gulp.src([`${dirs.tmp}/source/**/*`, `!**/*.json`, `!**/*.yml`, `!**/sw-reg.js`])
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

    return gulp.src(`${dirs.tmp}/**/*`)
        .pipe(plugins.revReplace({
            manifest,
            modifyUnreved: (unrevedPath) => {
                return unrevedPath.replace('static/images/', 'images/');
            },
            replaceInExtensions: ['.hbs', '.css', '.js', '.json', '.html', '.yml']
        }))
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('optimize:templates', () => {
    /*
        Because we are optimizing handlebars templates and not html,
        we can find things like `{{#if something}}true{{else}}false{{/if}}`
        that can cause problems with `html-minifier`.
        With this `RegExp` we try to capture all the valid handlebars blocks:
        `{{#`, `{{`, and combinations of these inside (like

        ```hbs
        <ul>
          {{#each items}}
          <li aria-selected="{{#if something}}true{{else}}false{{/if}}">{{this}}</li>
          {{/each}}
        </ul>
        ```
    */
    const handlebarsRegex = [[/\{\{#[^}]+\}\}/, /\{\{\/[^}]+\}\}/], [/\{\{#[^}]+\}\}\{\{#[^}]+\}\}/, /\{\{\/[^}]+\}\}\{\{\/[^}]+\}\}/], [/\{\{\w[^}]+\}\}/, /\{\{\/\w[^}]+\}\}/]];

    const htmlminOptions = {
        caseSensitive: true, // need it because handlebar helpers are case sensitive
        collapseBooleanAttributes: false,
        collapseWhitespace: true,
        customAttrAssign: handlebarsRegex,
        customAttrSurround: handlebarsRegex,
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

    return gulp.src(`${dirs.tmp}/**/*.hbs`)
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
    return gulp.src(dirs.tmpImages)
        .pipe(plugins.flatten())
        .pipe(gulp.dest(`${dirs.tmp}/source/static/images`));
};

gulp.task('move:images', moveImages);
gulp.task('optimize:images', gulp.series('move:docimage', 'imagemin', 'move:images'));

// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('compress:zopfli', () => {
    return gulp.src(dirs.distCompreseable)
        .pipe(plugins.zopfli())
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('compress:brotli', () => {
    return gulp.src(dirs.distCompreseable)
        .pipe(plugins.brotli.compress())
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('generate-service-worker', (callback) => {
    const swPrecache = require('sw-precache');

    swPrecache.write(`${dirs.dist}/sonarwhal-worker.js`, {
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

    return gulp.src(`${dirs.tmp}/**/*.hbs`)
        .pipe(plugins.transform('utf8', replaceSRI))
        .pipe(gulp.dest(dirs.tmp));
});

gulp.task('build', gulp.series(
    'clean:before',
    'copy:theme',
    'precompile',
    'optimize:images',
    'useref',
    'optimize:templates',
    'optimize:js',
    'optimize:css',
    'move:static',
    'move:helpers',
    'clean:after',
    'revfiles',
    'revreplace:content',
    'revreplace:theme',
    'sri',
    'add-sri',
    'build:hexo',
    'generate-service-worker',
    'compress:zopfli',
    'compress:brotli'
));

gulp.task('default', gulp.series('build'));

gulp.task('watch', gulp.series(['clean:before', 'copy:theme', 'precompile', 'move:docimage', 'move:images', 'useref', 'move:static', 'move:helpers', 'clean:after', 'revfiles', 'revreplace:content', 'revreplace:theme'], async () => {
    const hexo = new Hexo(process.cwd(), {});

    await hexo.init();
    await hexo.call('clean');

    gulp.watch(`${dirs.src}/**/*`, ['clean:tmp', 'copy:theme', 'precompile', 'move:docimage', 'move:images', 'useref', 'move:static', 'move:helpers', 'clean:after', 'revfiles', 'revreplace:content', 'revreplace:theme', async () => {
        await hexo.call('generate');
    }, 'generate-service-worker']);

    await hexo.call('generate');

    gulp.src(dirs.dist)
        .pipe(plugins.serverLivereload({
            livereload: true,
            open: true,
            port: 4000
        }));
}, 'generate-service-worker'));
