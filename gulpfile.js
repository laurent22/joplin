const gulp = require('gulp');
const ts = require('gulp-typescript');
const path = require('path');
const fs = require('fs-extra');
const tsProject = ts.createProject('tsconfig.json');
const serverRootDir = rtrimSlashes(__dirname);
const projectRootDir = path.dirname(serverRootDir);
const sourcemaps = require('gulp-sourcemaps');

function rtrimSlashes(path) {
	return path.replace(/[/\\]+$/, '');
}

function createDistDir() {
	return fs.mkdirp(`${serverRootDir}/dist`);
}

function buildTypeScripts() {
	return gulp.src([
		'ReactNativeClient/lib/*.ts',
	]).pipe(sourcemaps.init()).pipe(tsProject()).js.pipe(sourcemaps.write()).pipe(gulp.dest((src) => {
		const baseDir = rtrimSlashes(src.dirname.substr(serverRootDir.length + 1));
		return baseDir;
	}));
}

// function copyLib() {
// 	return gulp.src([`${projectRootDir}/ReactNativeClient/lib/**/*`]).pipe(gulp.dest(`${serverRootDir}/dist/lib`));
// }

gulp.task('default', async function () {
	// await createDistDir();
	// await copyLib();
	return buildTypeScripts();
});
