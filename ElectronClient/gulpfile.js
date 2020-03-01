const gulp = require('gulp');
const utils = require('../Tools/gulp/utils');

const tasks = {
	compileScripts: {
		fn: require('./tools/compileScripts'),
	},
	compilePackageInfo: {
		fn: require('./tools/compile-package-info.js'),
	},
	copyPluginAssets: {
		fn: require('./tools/copyPluginAssets.js'),
	},
	electronRebuild: {
		fn: require('./tools/electronRebuild.js'),
	},
	copyLib: require('../Tools/gulp/tasks/copyLib'),
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series(
	'copyLib',
	'compileScripts',
	'compilePackageInfo',
	'copyPluginAssets',
	// 'electronRebuild'
));
