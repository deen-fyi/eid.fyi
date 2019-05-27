var gulp = require('gulp4');
var sass = require('gulp-sass');
var browserSync = require('browser-sync').create();
var header = require('gulp-header');
var cleanCSS = require('gulp-clean-css');
var rename = require("gulp-rename");
var uglify = require('gulp-uglify');
var htmlmin = require('gulp-htmlmin');
var htmlreplace = require('gulp-html-replace');
const gulpReplaceImportant = require('gulp-replace-important');
var awspublish = require('gulp-awspublish')
var cloudfront = require('gulp-cloudfront-invalidate-aws-publish');
var awspublishRouter = require("gulp-awspublish-router");
var del = require('del');
const debug = require('gulp-debug');
var pkg = require('./package.json');

// Set the banner content
var banner = ['/*!\n',
  ' * Eid.fyi\n',
  ' * Copyright 2018-' + (new Date()).getFullYear(), ' Zaheer Mohiuddin\n',
  ' */\n',
  ''
].join('');

function cleanBuild() {
  return del([
    // here we use a globbing pattern to match everything inside the `public` folder
    'public/**/*',
    'vendor/**/*',
    'temp/**/*',
    'src/scss/creative.css'
  ]);
}

function cleanPostBuild() {
  return del([
    'temp/**'
  ]);
}

// Compiles SCSS files from /scss into /css
function sassFunc() {
  return gulp.src('src/scss/creative.scss')
    .pipe(sass().on('error', function(err) {
      console.error(err.message);
      browserSync.notify(err.message, 3000);
      this.emit('end');
    }))
    .pipe(gulp.dest('temp/css/'))
    .pipe(browserSync.reload({
      stream: true
    }));
}

// Minify compiled CSS
function minifyCss() {
  return gulp.src('temp/css/creative.css')
    .pipe(cleanCSS({
      compatibility: 'ie8'
    }))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/css'))
    .pipe(browserSync.reload({
      stream: true
    }));
}

// Minify custom JS
function minifyJs() {
  return gulp.src('src/js/creative.js')
    .pipe(uglify())
    .pipe(header(banner, {
      pkg: pkg
    }))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/js'))
    .pipe(browserSync.reload({
      stream: true
    }));
}

// Copy vendor files from /node_modules into /vendor
// NOTE: requires `npm install` before running!
function copyFunc(done) {
  gulp.src([
      'node_modules/bootstrap/dist/**/*',
      // we don't want to clean this file though so we negate the pattern
      '!**/npm.js',
      '!**/bootstrap-theme.*',
      '!**/*.map'
    ])
    .pipe(gulp.dest('public/vendor/bootstrap'))

  gulp.src(['node_modules/jquery/dist/jquery.js', 'node_modules/jquery/dist/jquery.min.js'])
    .pipe(gulp.dest('public/vendor/jquery'))

  gulp.src(['node_modules/popper.js/dist/umd/popper.js', 'node_modules/popper.js/dist/umd/popper.min.js'])
    .pipe(gulp.dest('public/vendor/popper'))

  gulp.src([
      'node_modules/font-awesome/**',
      '!node_modules/font-awesome/**/*.map',
      '!node_modules/font-awesome/.npmignore',
      '!node_modules/font-awesome/*.txt',
      '!node_modules/font-awesome/*.md',
      '!node_modules/font-awesome/*.json'
    ])
    .pipe(gulp.dest('public/vendor/font-awesome'))

    done();
}

function copyImgs() {
  return gulp.src([
      'src/img/**/*'
    ],  {base: './src/'}) 
    .pipe(gulp.dest('./public/'));
}

function copyMp3s() {
  return gulp.src([
      'src/mp3/**/*'
    ],  {base: './src/'}) 
    .pipe(gulp.dest('./public/'));
}

function copyFonts() {
  return gulp.src([
      'src/fonts/**/*'
    ],  {base: './src/'}) 
    .pipe(gulp.dest('./public/'));
}

function copyHtml() {
  return gulp.src([
      'src/*.html',
      '!src/*amp.html'
    ],  {base: './src/'})
    .pipe(htmlmin({collapseWhitespace: true, conservativeCollapse: true, removeComments: true}))
    .pipe(gulp.dest('./public/'));
}

function reload(done) {
  server.reload();
  done();
}

function serve(done) {
  server.init({
    server: {
      baseDir: './'
    }
  });
  done();
}

// Configure the browserSync task
function browserSyncFunc(done) {
  browserSync.init({
    server: {
      baseDir: 'public'
    }
  });
  done();
}

function publish() {
  // create a new publisher using S3 options 
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property 
  var publisher = awspublish.create({
    region: 'us-east-1',
    params: {
      Bucket: 'eid-fyi'
    }
  });
 
  // define custom headers 
  var headers = {
    'Cache-Control': 'max-age=1800, no-transform, public',
    'x-amz-acl': 'public-read'
  };

  return gulp.src("**", { cwd: "./public/" })
    .pipe(awspublishRouter({
        cache: {
            // cache for 5 minutes by default 
            cacheTime: 300
        },

        routes: {
            "^(?:img|vendor|fonts)/.+$": {
                // don't modify original key. this is the default 
                key: "$&",
                // use gzip for assets that benefit from it 
                gzip: true,
                // cache static assets for 1 week for user 
                cacheTime: 604800,
                // cache static assets for 20 years on the CDN 
                sharedCacheTime: 630720000
            },
            "^(?:mp3)/.+$": {
                // don't modify original key. this is the default 
                key: "$&",
                // use gzip for assets that benefit from it 
                gzip: false,
                // cache static assets for 1 week for user 
                cacheTime: 604800,
                // cache static assets for 20 years on the CDN 
                sharedCacheTime: 630720000
            },
            // pass-through for anything that wasn't matched by routes above, to be uploaded with default options 
            "^.+$": {
              gzip: true
            }
        }
    }))

    // publisher will add Content-Length, Content-Type and headers specified above 
    // If not specified it will set x-amz-acl to public-read by default 
    //headers, {force: true}
    .pipe(publisher.publish())

    .pipe(publisher.sync())
 
    // create a cache file to speed up consecutive uploads 
    //.pipe(publisher.cache())
 
     // print upload updates to console 
    .pipe(awspublish.reporter());
}

// Dev task with browserSync
function watcherFunc() {
  gulp.watch('src/scss/*.scss', gulp.series(sassFunc, minifyCss));
  //gulp.watch('css/*.css', ['minify-css']);
  //gulp.watch('src/js/*.js', ['minify-js']);
  gulp.watch('src/img/*', gulp.series(copyImgs, function(done) {
    browserSync.reload();
    done()
  }));

  gulp.watch('src/mp3/*', gulp.series(copyMp3s, function(done) {
    browserSync.reload();
    done()
  }));

  gulp.watch('src/fonts/*', gulp.series(copyFonts, function(done) {
    browserSync.reload();
    done()
  }));

  // Reloads the browser whenever HTML or JS files change
  gulp.watch('src/*.html', gulp.series(copyHtml, function(done) {
    browserSync.reload();
    done()
  }));
  gulp.watch('src/js/**/*.js', gulp.series(minifyJs, function(done) {
    browserSync.reload();
    done()
  }));
}

/*
 * You can use CommonJS `exports` module notation to declare tasks
 */
exports.cleanBuild = cleanBuild;
exports.cleanPostBuild = cleanPostBuild;
exports.sassFunc = sassFunc;
exports.minifyCss = minifyCss;
exports.minifyJs = minifyJs;
exports.copyFunc = copyFunc;
exports.copyImgs = copyImgs;
exports.copyMp3s = copyMp3s;
exports.copyFonts = copyFonts;
exports.copyHtml = copyHtml;
exports.publish = publish;
exports.browserSyncFunc = browserSyncFunc;
exports.watcherFunc = watcherFunc;

var core = gulp.parallel(gulp.series(sassFunc, minifyCss), minifyJs, copyFunc, copyImgs, copyMp3s, copyFonts, copyHtml);
var defaultBuild = gulp.series(cleanBuild, core, cleanPostBuild);

// Dev task with browserSync
var devTasks = gulp.series(cleanBuild, core, browserSyncFunc, gulp.parallel(watcherFunc));
gulp.task('dev', devTasks);

// Publish to AWS
var publishTasks = gulp.series(defaultBuild, publish);
gulp.task('publish', publishTasks);

// Default task
gulp.task('default', defaultBuild);