const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');
const compilePackageInfo = require('@joplin/tools/compilePackageInfo');
const { execCommand } = require('@joplin/utils');
const fs = require('fs-extra');
const path = require('path');

const distDir = `${__dirname}/dist`;

const tsConfigPaths = [
	path.join(__dirname, 'tsconfig.json'),
	path.join(__dirname, 'public', 'js', 'tsconfig.json'),
];

const tasks = {
	tsc: {
		fn: async () => {
			for (const tsConfigPath of tsConfigPaths) {
				await execCommand(['tsc', '--project', tsConfigPath]);
			}
		},
	},

	watch: {
		fn: async () => {
			const watchTasks = tsConfigPaths.map(tsConfigPath => {
				return execCommand(
					['tsc', '--watch', '--preserveWatchOutput', '--project', tsConfigPath],
				);
			});
			await Promise.all(watchTasks);
		},
	},

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
