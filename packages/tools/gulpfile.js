const gulp = require('gulp');
const utils = require('./gulp/utils');

const tasks = {
	// copyLib: require('./Tools/gulp/tasks/copyLib'),
	// tsc: require('./Tools/gulp/tasks/tsc'),
	updateIgnoredTypeScriptBuild: require('./gulp/tasks/updateIgnoredTypeScriptBuild'),
	// deleteBuildDirs: require('./Tools/gulp/tasks/deleteBuildDirs'),
};

utils.registerGulpTasks(gulp, tasks);

// gulp.task('build', gulp.series('copyLib', 'tsc', 'updateIgnoredTypeScriptBuild'));

// // The clean task removes build directories and copy back the library. This is useful
// // when switching from one branch to another.
// gulp.task('clean', gulp.series('deleteBuildDirs', 'copyLib'));
