const gulp = require('gulp');
const utils = require('./packages/tools/gulp/utils');

const tasks = {
	// copyLib: require('./packages/tools/gulp/tasks/copyLib'),
	// tsc: require('./packages/tools/gulp/tasks/tsc'),
	updateIgnoredTypeScriptBuild: require('./packages/tools/gulp/tasks/updateIgnoredTypeScriptBuild'),
	// deleteBuildDirs: require('./packages/tools/gulp/tasks/deleteBuildDirs'),
	completePublishAll: {
		fn: async () => {
			// await utils.execCommandVerbose('git pull');
			await utils.execCommandVerbose('git', ['add', '-A']);
			await utils.execCommandVerbose('git', ['commit', '-m', 'Releasing sub-packages']);
			await utils.execCommandVerbose('lerna', ['publish', 'from-package', '-y']);
			await utils.execCommandVerbose('git', ['push']);
		},
	},
};

utils.registerGulpTasks(gulp, tasks);

// gulp.task('build', gulp.series('copyLib', 'tsc', 'updateIgnoredTypeScriptBuild'));

// // The clean task removes build directories and copy back the library. This is useful
// // when switching from one branch to another.
// gulp.task('clean', gulp.series('deleteBuildDirs', 'copyLib'));
