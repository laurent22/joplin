const gulp = require('gulp');
const fs = require('fs-extra');
const utils = require('@joplin/tools/gulp/utils');
const { execSync } = require('child_process');

const tasks = {};

const buildOneNoteConverter = () => {
	const profile = process.env.NODE_ENV === 'production' ? '--release' : '--debug';
	return execSync(`yarn dlx wasm-pack build ../onenote-converter --target nodejs ${profile}`);
};

tasks.prepareBuild = {
	fn: async () => {
		buildOneNoteConverter();
		const buildDir = `${__dirname}/build`;
		await utils.copyDir(`${__dirname}/app`, buildDir, {
			excluded: ['node_modules'],
		});

		await utils.copyFile(`${__dirname}/package.json`, `${buildDir}/package.json`);
		await utils.setPackagePrivateField(`${buildDir}/package.json`, false);

		// await utils.copyFile(`${__dirname}/package-lock.json`, `${buildDir}/package-lock.json`);
		await utils.copyFile(`${__dirname}/gulpfile.js`, `${buildDir}/gulpfile.js`);

		fs.chmodSync(`${buildDir}/main.js`, 0o755);
	},
};

tasks.prepareTestBuild = {
	fn: async () => {
		const testBuildDir = `${__dirname}/tests-build`;

		await utils.copyDir(`${__dirname}/tests`, testBuildDir, {
			excluded: [
				'lib/',
				'locales/',
				'node_modules/',
				'*.ts',
				'*.tsx',
			],
		});

		await fs.mkdirp(`${testBuildDir}/data`);
	},
};

utils.registerGulpTasks(gulp, tasks);


gulp.task('build', gulp.series([
	'prepareBuild',
]));
