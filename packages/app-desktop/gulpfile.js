const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');

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
	copyTinyMceLangs: {
		fn: require('./tools/copyTinyMceLangs.js'),
	},
	electronRebuild: {
		fn: require('./tools/electronRebuild.js'),
	},
	tsc: require('@joplin/tools/gulp/tasks/tsc'),
	updateIgnoredTypeScriptBuild: require('@joplin/tools/gulp/tasks/updateIgnoredTypeScriptBuild'),
};

utils.registerGulpTasks(gulp, tasks);

const buildParallel = [
	'compileScripts',
	'compilePackageInfo',
	'copyPluginAssets',
	'copyTinyMceLangs',
	// 'updateIgnoredTypeScriptBuild',
];

gulp.task('build', gulp.parallel(...buildParallel));
