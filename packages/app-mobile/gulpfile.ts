const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');
import { buildInjectedJS, watchInjectedJS } from './tools/buildInjectedJs';

const tasks = {
	encodeAssets: {
		fn: require('./tools/encodeAssets'),
	},
	buildInjectedJs: {
		fn: buildInjectedJS,
	},
	watchInjectedJs: {
		fn: watchInjectedJS,
	},
	podInstall: {
		fn: require('./tools/podInstall'),
	},
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series(
	'buildInjectedJs',
	'encodeAssets',
	'podInstall',
));
