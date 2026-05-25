
import gulp from 'gulp';
import utils from '@joplin/tools/gulp/utils';
import compilePackageInfo from '@joplin/tools/compilePackageInfo';
import fs from 'fs-extra';
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
