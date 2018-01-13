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
        `${dirs.tmp}/source/core`,
        `${dirs.tmp}/source/js`,
        `${dirs.tmp}/source/components`,
        `${dirs.tmp}/source/images`,
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

gulp.task('optimize:templates', (cb) => {
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
        collapseWhitespace: true,
        customAttrAssign: handlebarsRegex,
        customAttrSurround: handlebarsRegex,
        minifyCSS: true,
        minifyJS: true,
        removeComments: true,
        removeOptionalTags: true
    };

    const cssToOptimize = plugins.filter([`**/static/**/*.css`],
        { restore: true });
    const jsToOptimize = plugins.filter([`**/static/**/*.js`],
        { restore: true });
    const filesNotToRev = plugins.filter([
        '**/*',
        '!**/*.hbs',
        '!**/*.yml',
        `!${dirs.tmp}/source/sw-reg.js`, // This will be in the root
        `!${dirs.tmp}/helper/**/*`,
        `!${dirs.tmp}/scripts/**/*`
    ], { restore: true });

    pump(
        [
            gulp.src(`${dirs.tmp}/**/*.*`),
            plugins.useref({
                base: `${dirs.tmp}/source/`,
                searchPath: `${dirs.tmp}/source/`
            }),
            jsToOptimize,
            plugins.uglify(),
            jsToOptimize.restore,
            cssToOptimize,
            plugins.cleanCss(),
            cssToOptimize.restore,
            filesNotToRev,
            plugins.rev(),
            plugins.revDeleteOriginal(),
            filesNotToRev.restore,
            gulp.dest(dirs.tmp),
            plugins.revReplace({
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
                replaceInExtensions: ['.hbs', '.css', '.js', '.html', '.yml']
            }),
            plugins.if('*.hbs', plugins.htmlmin(htmlminOptions)),
            gulp.dest(dirs.tmp)
        ],
        cb);
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

gulp.task('optimize:images', gulp.series(['imagemin', 'move:images']));

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
        staticFileGlobs: [`${dirs.dist}/**/*.{js,html,css,png,jpg,gif,ico,svg,woff}`],
        stripPrefix: dirs.dist
    }, callback);
});

gulp.task('build', gulp.series([
    'clean:before',
    'copy:theme',
    'optimize:templates',
    'move:static',
    'optimize:images',
    'clean:after',
    'build:hexo',
    'generate-service-worker',
    'compress:zopfli',
    'compress:brotli'
]));

gulp.task('default', gulp.series(['build']));

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
