const path = require('path');

const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const pump = require('pump');
const shelljs = require('shelljs');

const Hexo = require('hexo');

const imageExtensions = 'png,jpg,svg,ico';
const dirs = {
    dist: 'dist',
    distCompreseable: 'dist/**/*.{css,html,ico,js,svg,txt,xml,webmanifest}',
    src: 'src/sonarwhal-theme',
    tmp: 'src/sonarwhal-theme-optimized',
    tmpImages: `src/sonarwhal-theme-optimized/**/*.{${imageExtensions}}`
};

// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('clean:before', (done) => {
    shelljs.rm('-rf', dirs.dist, dirs.tmp);

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
        .pipe(plugins.debug())
        .pipe(gulp.dest(`${dirs.tmp}/source/static`));
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
        .pipe(plugins.debug())
        .pipe(plugins.rev())
        .pipe(plugins.revDeleteOriginal())
        .pipe(gulp.dest(`${dirs.tmp}/source`))
        .pipe(plugins.rev.manifest())
        .pipe(gulp.dest(`${dirs.tmp}`));
});

gulp.task('revreplace', () => {
    // const filesNotToRev = plugins.filter([
    //     `${dirs.tmp}/**/*`,
    //     `!${dirs.tmp}/**/*.hbs`,
    //     `!${dirs.tmp}/**/*.json`,
    //     `!${dirs.tmp}/**/*.yml`,
    //     `!${dirs.tmp}/**/source/sw-reg.js` // This will be in the root
    // ], { restore: true });

    const manifest = gulp.src(`${dirs.tmp}/rev-manifest.json`);

    return gulp.src(`${dirs.tmp}/**/*`)
        // .pipe(filesNotToRev)
        .pipe(plugins.debug())
        .pipe(plugins.revReplace({
            manifest,
            modifyReved: (revPath) => {
                const extension = path.extname(revPath);

                if (imageExtensions.split(',').includes(extension.substr(1))) {
                    return `static/images/${path.basename(revPath)}`;
                }
                // opensearch and webmanifest file
                if (extension.includes('.xml') || extension.includes('.webmanifest')) {
                    return `static/${path.basename(revPath)}`;
                }

                return revPath;
            },
            modifyUnreved: (unrevedPath) => {
                return unrevedPath.replace('source/', '');
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

gulp.task('optimize:images', gulp.series('imagemin', 'move:images'));

const devHtml = (cb) => {
    pump(
        [
            gulp.src(`${dirs.tmp}/**/*.*`),
            plugins.useref({
                base: `${dirs.tmp}/source/`,
                searchPath: `${dirs.tmp}/source/`
            }),
            gulp.dest(dirs.tmp)
        ],
        cb);
};

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

gulp.task('build', gulp.series(
    'clean:before',
    'copy:theme',
    'optimize:images',
    'useref',
    'optimize:templates',
    'optimize:js',
    'optimize:css',
    'move:static',
    'clean:after',
    'revfiles',
    'revreplace',
    // 'build:hexo',
    // 'generate-service-worker',
    // 'compress:zopfli',
    // 'compress:brotli'
));

gulp.task('default', gulp.series('build'));

gulp.task('watch', gulp.series('clean:before', 'copy:theme', async () => {
    const hexo = new Hexo(process.cwd(), {});

    console.log(`Deleting content in ${dirs.dist}`);

    await hexo.init();
    await hexo.call('clean');

    gulp.watch(`${dirs.src}/**/*`, gulp.series('copy:theme'));
    gulp.watch([`!${dirs.tmpImages}`], gulp.series(devHtml));
    gulp.watch([dirs.tmpImages], gulp.series(moveImages));

    await hexo.call('generate', { watch: true });

    gulp.src(dirs.dist)
        .pipe(plugins.serverLivereload({
            livereload: true,
            open: true,
            port: 4000
        }));
}));
