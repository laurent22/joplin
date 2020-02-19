const gulp = require('gulp');
const utils = require('../Tools/gulp/utils');

const tasks = {
	compileScripts: {
		fn: require('./compile'),
	},
	compilePackageInfo: {
		fn: require('./compile-package-info.js'),
	},
	copyPluginAssets: {
		fn: require('./copyPluginAssets.js'),
	},
	electronRebuild: {
		fn: require('./electronRebuild.js'),
	},
	copyLib: require('../Tools/gulp/tasks/copyLib'),
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series(
	'copyLib',
	'compileScripts',
	'compilePackageInfo',
	'copyPluginAssets',
	'electronRebuild'
));
