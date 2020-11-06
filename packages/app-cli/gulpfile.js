const gulp = require('gulp');
const fs = require('fs-extra');
const utils = require('@joplinapp/tools/gulp/utils');
const tasks = {
	// compileExtensions: {
	// 	fn: require('../Tools/gulp/tasks/compileExtensions.js'),
	// },
	// copyLib: require('../Tools/gulp/tasks/copyLib'),
	// tsc: require('../Tools/gulp/tasks/tsc'),
	// updateIgnoredTypeScriptBuild: require('../Tools/gulp/tasks/updateIgnoredTypeScriptBuild'),
};

async function makePackagePublic(filePath) {
	const text = await fs.readFile(filePath, 'utf8');
	const obj = JSON.parse(text);
	delete obj.private;
	await fs.writeFile(filePath, JSON.stringify(obj), 'utf8');
}

tasks.prepareBuild = {
	fn: async () => {
		const buildDir = `${__dirname}/build`;
		await utils.copyDir(`${__dirname}/app`, buildDir, {
			excluded: ['node_modules'],
		});

		await utils.copyFile(`${__dirname}/package.json`, `${buildDir}/package.json`);
		await makePackagePublic(`${buildDir}/package.json`);

		await utils.copyFile(`${__dirname}/package-lock.json`, `${buildDir}/package-lock.json`);
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

		// const rootDir = utils.rootDir();

		// await utils.copyDir(`${rootDir}/packages/app-mobile/lib`, `${testBuildDir}/lib`, {
		// 	excluded: [
		// 		`${rootDir}/packages/app-mobile/lib/joplin-renderer/node_modules`,
		// 	],
		// });
		// await utils.copyDir(`${rootDir}/packages/app-mobile/locales`, `${testBuildDir}/locales`);
		await fs.mkdirp(`${testBuildDir}/data`);
	},
};

utils.registerGulpTasks(gulp, tasks);


gulp.task('build', gulp.series([
	'prepareBuild',
	// 'compileExtensions',
	// 'copyLib',
]));

// gulp.task('buildTests', gulp.series([
// 	// 'prepareTestBuild',
// 	// 'compileExtensions',
// 	// 'copyLib',
// ]));
