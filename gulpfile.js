#!/usr/local/bin/node
var gulp = require('gulp');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var autoprefix = require('gulp-autoprefixer');
var livereload = require('gulp-livereload');
var sourcemaps = require('gulp-sourcemaps');

var paths = {
    build: "./public",
    js: "./assets/js",
    scss: "./assets/scss"
};

var files = {
    lib: [
        'assets/vendor/jquery/dist/jquery.min.js',
        'assets/vendor/underscore/underscore-min.js',
        'assets/vendor/bootstrap-sass/assets/javascripts/bootstrap.min.js',
        'assets/vendor/angular/angular.min.js',
        'assets/vendor/angular-route/angular-route.min.js',
        'assets/vendor/angular-animate/angular-animate.min.js',
        'assets/vendor/backbone/backbone-min.js',
        'assets/vendor/moment/min/moment.min.js',
        'assets/vendor/angularjs-datepicker/dist/angular-datepicker.min.js'
    ],

    src: [
        'assets/js/main.js',
        'assets/js/controllers/loginCtrl.js',
        'assets/js/controllers/submissionCtrl.js',
        'assets/js/controllers/adminCtrl.js',
    ],

    scss: [
        'assets/scss/base.scss',
        'assets/scss/app.scss'
    ],

    css: [
        'assets/vendor/angularjs-datepicker/dist/angular-datepicker.min.css'
    ]
};

gulp.task('sass', function(){
    return gulp.src(files.scss)
        .pipe(sass({
            outputStyle:"compressed"}).on('error', sass.logError))
        .pipe(autoprefix())
        .pipe(gulp.dest(paths.build))
        .pipe(livereload());
});
gulp.task('css-lib', function(){
    return gulp.src(files.css)
        .pipe(concat('lib.css'))
        .pipe(gulp.dest(paths.build));
});

gulp.task('scripts-lib', function() {
    return gulp.src(files.lib)
        .pipe(concat('lib.js'))
        .pipe(gulp.dest(paths.build));
});
gulp.task('scripts-src', function() {
    return gulp.src(files.src)
        .pipe(sourcemaps.init())
        .pipe(concat('src.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(paths.build))
        .pipe(livereload());
});

gulp.task('server', function(){
    require('./index');
});

gulp.task('watch', function(){
    livereload.listen();
    gulp.watch('./assets/js/**/*.js',['scripts-src']);
    gulp.watch('./assets/scss/**/*.scss',['sass']);
    gulp.watch('./app/views/**/**/*.ejs', function(event) {
        gulp.src(event.path).pipe(livereload());
    });
});

gulp.task('default', ['sass','scripts-lib','scripts-src','css-lib']);