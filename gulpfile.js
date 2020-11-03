const gulp = require('gulp');
const utils = require('./packages/tools/gulp/utils');

const tasks = {
	copyLib: require('./packages/tools/gulp/tasks/copyLib'),
	tsc: require('./packages/tools/gulp/tasks/tsc'),
	updateIgnoredTypeScriptBuild: require('./packages/tools/gulp/tasks/updateIgnoredTypeScriptBuild'),
	deleteBuildDirs: require('./packages/tools/gulp/tasks/deleteBuildDirs'),
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series('copyLib', 'tsc', 'updateIgnoredTypeScriptBuild'));

// The clean task removes build directories and copy back the library. This is useful
// when switching from one branch to another.
gulp.task('clean', gulp.series('deleteBuildDirs', 'copyLib'));
