const gulp = require('gulp');
const fs = require('fs-extra');
const utils = require('../Tools/gulp/utils');
const tasks = {
	copyLib: require('../Tools/gulp/tasks/copyLib'),
};

tasks.build = {
	fn: async () => {
		const buildDir = `${__dirname}/build`;
		await utils.copyDir(`${__dirname}/app`, buildDir, {
			excluded: ['node_modules'],
		});
		await utils.copyDir(`${__dirname}/locales-build`, `${buildDir}/locales`);
		await tasks.copyLib.fn();
		await utils.copyFile(`${__dirname}/package.json`, `${buildDir}/package.json`);
		fs.chmodSync(`${buildDir}/main.js`, 0o755);
	},
};

tasks.buildTests = {
	fn: async () => {
		const testBuildDir = `${__dirname}/tests-build`;

		await utils.copyDir(`${__dirname}/tests`, testBuildDir, {
			excluded: [
				'lib/',
				'locales/',
				'node_modules/',
			],
		});

		await utils.copyDir(`${__dirname}/../ReactNativeClient/lib`, `${testBuildDir}/lib`);
		await utils.copyDir(`${__dirname}/../ReactNativeClient/locales`, `${testBuildDir}/locales`);
		await fs.mkdirp(`${testBuildDir}/data`);
	},
};

gulp.task('build', tasks.build.fn);
gulp.task('buildTests', tasks.buildTests.fn);
