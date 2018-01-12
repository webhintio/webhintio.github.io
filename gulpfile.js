const path = require('path');

const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const pump = require('pump');
const shelljs = require('shelljs');

const Hexo = require('hexo');

const dirs = {
    dist: 'dist',
    src: 'src/sonarwhal-theme',
    tmp: 'src/sonarwhal-theme-optimized'
};
const imageExtensions = 'png,jpg,svg,ico';

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
        `!${dirs.tmp}/helper/**/*`,
        `!${dirs.tmp}/scripts/**/*`
    ], { restore: true });

    pump(
        [
            gulp.src(`${dirs.tmp}/**/*.*`),
            plugins.useref({
                base: `${dirs.tmp}/source/`,
                searchPath: './src/sonarwhal-theme-optimized/source'
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
                    if (imageExtensions.split(',').includes(path.extname(revPath).substr(1))) {
                        return `static/images/${path.basename(revPath)}`;
                    }

                    return revPath;
                },
                modifyUnreved: (unrevedPath) => {
                    return unrevedPath.replace('source/', '');
                },
                replaceInExtensions: ['.hbs', '.css', '.js', '.html']
            }),
            plugins.if('*.hbs', plugins.htmlmin(htmlminOptions)),
            gulp.dest(dirs.tmp)
        ],
        cb);
});

gulp.task('imagemin', () => {
    return gulp.src(`${dirs.tmp}/**/*.{${imageExtensions}}`)
        .pipe(plugins.imagemin())
        .pipe(gulp.dest(dirs.tmp));
});

const moveImages = () => {
    return gulp.src(`${dirs.tmp}/**/*.{${imageExtensions}}`)
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
                searchPath: './src/sonarwhal-theme-optimized/source'
            }),
            gulp.dest(dirs.tmp)
        ],
        cb);
};

// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('compress:zopfli', () => {
    return gulp.src(`${dirs.dist}/**/*.{css,html,ico,js,svg,txt,xml,webmanifest}`)
        .pipe(plugins.zopfli())
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('compress:brotli', () => {
    return gulp.src(`${dirs.dist}/**/*.{css,html,ico,js,svg,txt,xml,webmanifest}`)
        .pipe(plugins.brotli.compress())
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('build', gulp.series([
    'clean:before',
    'copy:theme',
    'optimize:templates',
    'move:static',
    'optimize:images',
    'clean:after',
    'build:hexo',
    'compress:zopfli',
    'compress:brotli'
]));

gulp.task('default', gulp.series(['build']));

gulp.task('watch', gulp.series('clean:before', 'copy:theme', async () => {
    const hexo = new Hexo(process.cwd(), {});

    console.log(`Deleting content in ${dirs.dist}`);

    await hexo.init();
    await hexo.call('clean');

    const images = `${dirs.tmp}/**/*.{${imageExtensions}}`;

    gulp.watch(`${dirs.src}/**/*`, gulp.series('copy:theme'));
    gulp.watch([`!${images}`], gulp.series(devHtml));
    gulp.watch([images], gulp.series(moveImages));

    await hexo.call('generate', { watch: true });

    gulp.src(dirs.dist)
        .pipe(plugins.serverLivereload({
            livereload: true,
            open: true,
            port: 4000
        }));

    // gulp.watch([
    //     `${dirs.src}/**/*.html`
    // ], reload);

    // gulp.watch([
    //     `${dirs.src}/css/**/*.css`,
    //     `${dirs.src}/img/**/*`,
    //     `!${dirs.src}/css/main.css`
    // ], ['generate:main.css']);

    // gulp.watch([
    //     `${dirs.src}/js/**/*.js`,
    //     'gulpfile.js'
    // ]);
}));

// gulp.task('serve:build', ['build'], () => {
//     browserSyncOptions.server = dirs.dist;
//     browserSync(browserSyncOptions);
// });
