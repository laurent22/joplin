const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');
const compilePackageInfo = require('@joplin/tools/compilePackageInfo');
const fs = require('fs-extra');

const tasks = {
	compilePackageInfo: {
		fn: async () => {
			const targetDir = `${__dirname}/dist`;
			await fs.mkdirp(targetDir);
			await compilePackageInfo(`${__dirname}/package.json`, `${targetDir}/packageInfo.js`);
		},
	},
};

utils.registerGulpTasks(gulp, tasks);

const buildParallel = [
	'compilePackageInfo',
];

gulp.task('build', gulp.parallel(...buildParallel));
