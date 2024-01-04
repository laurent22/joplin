const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');

import buildDefaultPlugins from '@joplin/default-plugins/commands/buildAll';
import { AppType } from '@joplin/default-plugins/types';

import injectedJsGulpTasks from './tools/buildInjectedJs/gulpTasks';

const tasks = {
	encodeAssets: {
		fn: require('./tools/encodeAssets'),
	},
	...injectedJsGulpTasks,
	buildDefaultPlugins: {
		fn: async () => {
			const outputDir = `${__dirname}/plugins/sources/`;
			await buildDefaultPlugins(AppType.Mobile, outputDir);
		},
	},
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
	'copyWebviewLib',
));

gulp.task('watchInjectedJs', gulp.series(
	'beforeBundle',
	'copyWebviewLib',
	gulp.parallel(
		'watchCodeMirrorEditor',
		'watchJsDrawEditor',
		'watchPluginBackgroundScript',
	),
));

gulp.task('build', gulp.series(
	'buildInjectedJs',
	'buildDefaultPlugins',
	'encodeAssets',
	'podInstall',
));
