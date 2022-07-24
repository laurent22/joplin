'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');
const buildInjectedJs_1 = require('./tools/buildInjectedJs');
const tasks = {
	encodeAssets: {
		fn: require('./tools/encodeAssets'),
	},
	buildInjectedJs: {
		fn: buildInjectedJs_1.buildInjectedJS,
	},
	watchInjectedJs: {
		fn: buildInjectedJs_1.watchInjectedJS,
	},
	podInstall: {
		fn: require('./tools/podInstall'),
	},
};
utils.registerGulpTasks(gulp, tasks);
gulp.task('build', gulp.series('buildInjectedJs', 'encodeAssets', 'podInstall'));
// # sourceMappingURL=gulpfile.js.map
