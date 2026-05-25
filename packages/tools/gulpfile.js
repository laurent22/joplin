
import copyLib_544 from './Tools/gulp/tasks/copyLib';
import tsc_545 from './Tools/gulp/tasks/tsc';
import updateIgnoredTypeScriptBuild_546 from './gulp/tasks/updateIgnoredTypeScriptBuild';
import deleteBuildDirs_547 from './Tools/gulp/tasks/deleteBuildDirs';
import gulp from 'gulp';
import utils from './gulp/utils';
const tasks = {
	// copyLib: copyLib_544,
	// tsc: tsc_545,
	updateIgnoredTypeScriptBuild: updateIgnoredTypeScriptBuild_546,
	// deleteBuildDirs: deleteBuildDirs_547,
};

utils.registerGulpTasks(gulp, tasks);

// gulp.task('build', gulp.series('copyLib', 'tsc', 'updateIgnoredTypeScriptBuild'));

// // The clean task removes build directories and copy back the library. This is useful
// // when switching from one branch to another.
// gulp.task('clean', gulp.series('deleteBuildDirs', 'copyLib'));
