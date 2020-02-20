const gulp = require('gulp');
const utils = require('../Tools/gulp/utils');

const tasks = {
	encodeAssets: {
		fn: require('./tools/encodeAssets'),
	},
	buildReactNativeInjectedJs: {
		fn: require('./tools/buildReactNativeInjectedJs'),
	},
};

tasks.jetify = {
	fn: async () => {
		return utils.execCommand('npx jetify');
	},
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series(
	'buildReactNativeInjectedJs',
	'jetify',
	'encodeAssets',
));
