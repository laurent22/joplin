const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');
const compileSass = require('@joplin/tools/compileSass');
const compilePackageInfo = require('@joplin/tools/compilePackageInfo');
import buildDefaultPlugins from '@joplin/default-plugins/commands/buildAll';
import copy7Zip from './tools/copy7Zip';
import bundleJs from './tools/bundleJs';
import { remove } from 'fs-extra';
import execa = require('execa');
import cleanOnnxRuntime from './tools/cleanOnnxRuntime';

const tasks = {
	installElectron: {
		// Allows importing Electron from tests in CI.
		// With Electron 42, Electron doesn't download until the first "yarn start".
		// Not all CI jobs that run automated tests run "yarn start".
		fn: async () => {
			const path = require.resolve('electron/install.js');
			await execa.node(path, { stdio: 'inherit' });
		},
	},
	bundle: {
		fn: () => bundleJs(false),
	},
	// Bundles and computes additional information that can be analysed with
	// locally or with https://esbuild.github.io/analyze/.
	bundleWithStats: {
		fn: () => bundleJs(true),
	},
	compileScripts: {
		fn: require('./tools/compileScripts'),
	},
	compilePackageInfo: {
		fn: async () => {
			await compilePackageInfo(`${__dirname}/package.json`, `${__dirname}/packageInfo.js`);
		},
	},
	copyPluginAssets: {
		fn: require('./tools/copyPluginAssets.js'),
	},
	copyApplicationAssets: {
		fn: require('./tools/copyApplicationAssets.js'),
	},
	electronRebuild: {
		fn: require('./tools/electronRebuild.js'),
	},
	electronBuilder: {
		fn: require('./tools/electronBuilder.js'),
	},
	copyDefaultPluginsAssets: {
		fn: async () => {
			await copy7Zip();
		},
	},
	buildDefaultPlugins: {
		fn: async () => {
			const outputDir = `${__dirname}/build/defaultPlugins/`;
			await remove(outputDir);
			await buildDefaultPlugins(outputDir);
		},
	},
	tsc: require('@joplin/tools/gulp/tasks/tsc'),
	updateIgnoredTypeScriptBuild: require('@joplin/tools/gulp/tasks/updateIgnoredTypeScriptBuild'),
	buildScriptIndexes: require('@joplin/tools/gulp/tasks/buildScriptIndexes'),
	compileSass: {
		fn: async () => {
			await compileSass(
				`${__dirname}/style.scss`,
				`${__dirname}/style.min.css`,
			);
		},
	},
	cleanOnnxRuntime: {
		fn: cleanOnnxRuntime,
	},
};

utils.registerGulpTasks(gulp, tasks);

const buildBeforeStartParallel = gulp.parallel(
	'installElectron',
	'compileScripts',
	'compilePackageInfo',
	'copyPluginAssets',
	'copyApplicationAssets',
	'updateIgnoredTypeScriptBuild',
	'buildScriptIndexes',
	'compileSass',
	'cleanOnnxRuntime',
);
const buildRequiresTsc = gulp.series('bundle');

gulp.task('before-start', gulp.series(
	buildRequiresTsc,
	buildBeforeStartParallel,
));
gulp.task('before-dist', gulp.series(
	buildRequiresTsc,
	'cleanOnnxRuntime',
));

// Since "build" runs before "tsc", exclude tasks that require
// other packages to be built (i.e. don't include buildRequiresTsc).
const buildSequential = [
	buildBeforeStartParallel,
	'copyDefaultPluginsAssets',
	'buildDefaultPlugins',
];

gulp.task('build', gulp.series(buildSequential));
