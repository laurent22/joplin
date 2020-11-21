const gulp = require('gulp');
const ts = require('gulp-typescript');
const path = require('path');
const fs = require('fs-extra');
const tsProject = ts.createProject('tsconfig.json');
const serverRootDir = rtrimSlashes(__dirname);
const projectRootDir = path.dirname(serverRootDir);
const sourcemaps = require('gulp-sourcemaps');
const watch = require('gulp-watch');

const config = {
	assetDirs: [
		[`${projectRootDir}/ReactNativeClient/lib/**/*.js`, `${serverRootDir}/dist/lib`],
		[`${projectRootDir}/Server/app/views/**/*.mustache`, `${serverRootDir}/dist/app/views`],
		[`${projectRootDir}/Server/public/**/*`, `${serverRootDir}/dist/public`],
	],
};

function rtrimSlashes(path) {
	return path.replace(/[/\\]+$/, '');
}

function createDistDir() {
	return fs.mkdirp(`${serverRootDir}/dist`);
}

function buildTs() {
	return gulp.src([
		'app/*.ts',
		'app/controllers/*.ts',
		'app/models/*.ts',
		'app/routes/*.ts',
		'app/routes/api/*.ts',
		'app/routes/oauth2/*.ts',
		'app/utils/*.ts',
		'app/services/*.ts',
		'migrations/*.ts',
		'tests/*.ts',
		'tests/routes/*.ts',
		'tests/controllers/*.ts',
		'tests/utils/*.ts',
		'tools/*.ts',
	]).pipe(sourcemaps.init()).pipe(tsProject()).js.pipe(sourcemaps.write()).pipe(gulp.dest((src) => {
		const baseDir = rtrimSlashes(src.dirname.substr(serverRootDir.length + 1));
		return `dist/${baseDir}`;
	}));
}

async function copyLib() {
	for (const d of config.assetDirs) {
		await gulp.src(d[0]).pipe(gulp.dest(d[1]));
	}
}

gulp.task('default', async function() {
	await createDistDir();
	await copyLib();
	return buildTs();
});

gulp.task('watch-assets', function() {
	const options = { verbose: true, ignoreInitial: true };
	for (const d of config.assetDirs) {
		watch(d[0], options).pipe(gulp.dest(d[1]));
	}
});
