const gulp = require('gulp');
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

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series(
	'buildReactNativeInjectedJs',
	'encodeAssets',
	'podInstall'
));
