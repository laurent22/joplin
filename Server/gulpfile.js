const gulp = require('gulp');
const ts = require('gulp-typescript');
const path = require('path');
const fs = require('fs-extra');
const tsProject = ts.createProject('tsconfig.json');
const serverRootDir = rtrimSlashes(__dirname);
const projectRootDir = path.dirname(serverRootDir);

function rtrimSlashes(path) {
	return path.replace(/[/\\]+$/, '');
}

function createDistDir() {
	return fs.mkdirp(serverRootDir + '/dist');
}

function buildTypeScripts() {
	return gulp.src(['app/routes/*.ts', 'app/*.ts', 'migrations/*.ts']).pipe(tsProject()).js.pipe(gulp.dest((src) => {
		const baseDir = rtrimSlashes(src.dirname.substr(serverRootDir.length + 1));
		return 'dist/' + baseDir;
	}));
}

function copyLib() {
	return gulp.src([projectRootDir + '/ReactNativeClient/lib/**/*']).pipe(gulp.dest(serverRootDir + '/dist/lib'));
}

gulp.task('default', async function () {
	await createDistDir();
	await copyLib();
	return buildTypeScripts();
});
