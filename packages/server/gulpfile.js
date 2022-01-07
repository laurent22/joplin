const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');
const compilePackageInfo = require('@joplin/tools/compilePackageInfo');
const fs = require('fs-extra');

const distDir = `${__dirname}/dist`;

const tasks = {
	compilePackageInfo: {
		fn: async () => {
			await fs.mkdirp(distDir);
			await compilePackageInfo(`${__dirname}/package.json`, `${distDir}/packageInfo.js`);
		},
	},

	clean: {
		fn: async () => {
			await fs.remove(distDir);
		},
	},
};

utils.registerGulpTasks(gulp, tasks);

const buildParallel = [
	'compilePackageInfo',
];

gulp.task('build', gulp.parallel(...buildParallel));
