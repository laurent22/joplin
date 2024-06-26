const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');

import injectedJsGulpTasks from './tools/buildInjectedJs/gulpTasks';

const tasks = {
	encodeAssets: {
		fn: require('./tools/encodeAssets'),
	},
	copyWebAssets: {
		fn: require('./tools/copyAssets').default,
	},
	...injectedJsGulpTasks,
	podInstall: {
		fn: require('./tools/podInstall'),
	},
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('buildInjectedJs', gulp.series(
	'beforeBundle',
	'buildCodeMirrorEditor',
	'buildJsDrawEditor',
	'buildPluginBackgroundScript',
	'buildNoteViewerBundle',
	'copyWebviewLib',
));

gulp.task('watchInjectedJs', gulp.series(
	'beforeBundle',
	'copyWebviewLib',
	gulp.parallel(
		'watchCodeMirrorEditor',
		'watchJsDrawEditor',
		'watchPluginBackgroundScript',
		'watchNoteViewerBundle',
	),
));

gulp.task('build', gulp.series(
	'buildInjectedJs',
	'copyWebAssets',
	'encodeAssets',
	'podInstall',
));
