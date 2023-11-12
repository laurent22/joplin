const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');

import gulpTasks from './tools/buildInjectedJs/gulpTasks';

const tasks = {
	encodeAssets: {
		fn: require('./tools/encodeAssets'),
	},
	...gulpTasks,
	podInstall: {
		fn: require('./tools/podInstall'),
	},
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('buildInjectedJs', gulp.series(
	'beforeBundle',
	'buildCodeMirrorEditor',
	'buildJsDrawEditor',
	'copyWebviewLib',
));

gulp.task('watchInjectedJs', gulp.series(
	'beforeBundle',
	'copyWebviewLib',
	gulp.parallel(
		'watchCodeMirrorEditor',
		'watchJsDrawEditor',
	),
));

gulp.task('build', gulp.series(
	'buildInjectedJs',
	'encodeAssets',
	'podInstall',
));
