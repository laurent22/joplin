const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');

const tasks = {
	encodeAssets: {
		fn: require('./tools/encodeAssets'),
	},
	buildInjectedJs: {
		fn: require('./tools/buildInjectedJs'),
	},
	podInstall: {
		fn: require('./tools/podInstall'),
	},
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series(
	'buildInjectedJs',
	'encodeAssets',
	'podInstall'
));
