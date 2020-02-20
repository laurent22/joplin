const gulp = require('gulp');
const execa = require('execa');
const utils = require('../Tools/gulp/utils');

const tasks = {
	encodeAssets: {
		fn: require('./tools/encodeAssets'),
	},
	buildReactNativeInjectedJs: {
		fn: require('./tools/buildReactNativeInjectedJs'),
	},
	podInstall: {
		fn: require('./tools/podInstall'),
	},
};

tasks.jetify = {
	fn: async () => {
		const promise = execa('npx', ['jetify']);
		promise.stdout.pipe(process.stdout);
		return promise;
	},
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series(
	'buildReactNativeInjectedJs',
	'jetify',
	'encodeAssets',
	'podInstall',
));
