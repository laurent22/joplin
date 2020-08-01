const gulp = require('gulp');
const utils = require('./Tools/gulp/utils');

const tasks = {
	copyLib: require('./Tools/gulp/tasks/copyLib'),
	tsc: require('./Tools/gulp/tasks/tsc'),
	updateIgnoredTypeScriptBuild: require('./Tools/gulp/tasks/updateIgnoredTypeScriptBuild'),
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series('copyLib', 'tsc', 'updateIgnoredTypeScriptBuild'));
