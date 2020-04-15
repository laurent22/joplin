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
	tsc: require('../Tools/gulp/tasks/tsc'),
};

utils.registerGulpTasks(gulp, tasks);

const buildSeries = [
	'copyLib',
];

// On Windows also run tsc because `npm run watch` locks some folders
// which makes the copyPluginAssets command fail. For that reason,
// it's not possible to run watch on Windows while testing the desktop app.
if (require('os').platform() === 'win32') {
	buildSeries.push('tsc');
}

const buildParallel = [
	gulp.series(...buildSeries),
	'compileScripts',
	'compilePackageInfo',
	'copyPluginAssets',
];

gulp.task('build', gulp.parallel(...buildParallel));
