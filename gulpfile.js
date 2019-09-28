const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const serverRootDir = rtrimSlashes(__dirname);
const sourcemaps = require('gulp-sourcemaps');
const header = require('gulp-header');

function rtrimSlashes(path) {
	return path.replace(/[/\\]+$/, '');
}

function buildTypeScripts() {
	return gulp.src([
		'ReactNativeClient/lib/*.ts',
	])
		.pipe(sourcemaps.init())
		.pipe(tsProject()).js
		.pipe(sourcemaps.write())
		.pipe(header('/* eslint-disable */\n'))
		.pipe(gulp.dest((src) => {
			const baseDir = rtrimSlashes(src.dirname.substr(serverRootDir.length + 1));
			return baseDir;
		}));
}

gulp.task('default', async function() {
	return buildTypeScripts();
});
