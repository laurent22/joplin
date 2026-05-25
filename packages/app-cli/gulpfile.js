
import gulp, { task, series } from 'gulp';
import { chmodSync, mkdirp } from 'fs-extra';
import { copyDir, copyFile, setPackagePrivateField, registerGulpTasks } from '@joplin/tools/gulp/utils';
const tasks = {};

tasks.prepareBuild = {
	fn: async () => {
		const buildDir = `${__dirname}/build`;
		await copyDir(`${__dirname}/app`, buildDir, {
			excluded: ['node_modules'],
		});

		await copyFile(`${__dirname}/package.json`, `${buildDir}/package.json`);
		await setPackagePrivateField(`${buildDir}/package.json`, false);

		// await utils.copyFile(`${__dirname}/package-lock.json`, `${buildDir}/package-lock.json`);
		await copyFile(`${__dirname}/gulpfile.js`, `${buildDir}/gulpfile.js`);

		chmodSync(`${buildDir}/main.js`, 0o755);
	},
};

tasks.prepareTestBuild = {
	fn: async () => {
		const testBuildDir = `${__dirname}/tests-build`;

		await copyDir(`${__dirname}/tests`, testBuildDir, {
			excluded: [
				'lib/',
				'locales/',
				'node_modules/',
				'*.ts',
				'*.tsx',
			],
		});

		await mkdirp(`${testBuildDir}/data`);
	},
};

registerGulpTasks(gulp, tasks);


task('build', series([
	'prepareBuild',
]));
