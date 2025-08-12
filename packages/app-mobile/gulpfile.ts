const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');
const compilePackageInfo = require('@joplin/tools/compilePackageInfo');

import injectedJsGulpTasks from './tools/buildInjectedJs/gulpTasks';

const tasks = {
	encodeAssets: {
		fn: require('./tools/encodeAssets'),
	},
	copyWebAssets: {
		fn: require('./tools/copyAssets').default,
	},
	compilePackageInfo: {
		fn: async () => {
			await compilePackageInfo(`${__dirname}/package.json`, `${__dirname}/packageInfo.js`);
		},
	},

	...injectedJsGulpTasks,
	podInstall: {
		fn: require('./tools/podInstall'),
	},
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('buildInjectedJs', gulp.series(
	'beforeBundle',
	'buildBundledJs',
	'copyWebviewLib',
));

gulp.task('watchInjectedJs', gulp.series(
	'beforeBundle',
	'copyWebviewLib',
	'watchBundledJs',
));

gulp.task('build', gulp.series(
	'compilePackageInfo',
	'buildInjectedJs',
	'copyWebAssets',
	'encodeAssets',
	'podInstall',
));
