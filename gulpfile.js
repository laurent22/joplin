const gulp = require('gulp');
const utils = require('./packages/tools/gulp/utils');

const tasks = {
	// copyLib: require('./packages/tools/gulp/tasks/copyLib'),
	// tsc: require('./packages/tools/gulp/tasks/tsc'),
	// updateIgnoredTypeScriptBuild: require('./packages/tools/gulp/tasks/updateIgnoredTypeScriptBuild'),
	// deleteBuildDirs: require('./packages/tools/gulp/tasks/deleteBuildDirs'),
	completePublishAll: {
		fn: async () => {
			await utils.execCommand('git pull');
			await utils.execCommand('git add -A');
			await utils.execCommand('git commit -m "Releasing sub-packages"');
			await utils.execCommand('lerna publish from-package');
			await utils.execCommand('git push');
		},
	},
};

utils.registerGulpTasks(gulp, tasks);

// gulp.task('build', gulp.series('copyLib', 'tsc', 'updateIgnoredTypeScriptBuild'));

// // The clean task removes build directories and copy back the library. This is useful
// // when switching from one branch to another.
// gulp.task('clean', gulp.series('deleteBuildDirs', 'copyLib'));
