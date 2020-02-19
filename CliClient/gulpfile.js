const gulp = require('gulp');
const fs = require('fs-extra');
const utils = require('../Tools/gulp/utils');
const tasks = {
	copyLib: require('../Tools/gulp/tasks/copyLib'),
};

const buildDir = `${__dirname}/build`;

tasks.build = {
	fn: async () => {
		await utils.copyDir(`${__dirname}/app`, buildDir, {
			excluded: ['node_modules'],
		});
		await utils.copyDir(`${__dirname}/locales-build`, `${buildDir}/locales`);
		await tasks.copyLib.fn();
		await utils.copyFile(`${__dirname}/package.json`, `${buildDir}/package.json`);
		fs.chmodSync(`${buildDir}/main.js`, 0o755);
	},
};

gulp.task('build', tasks.build.fn);
