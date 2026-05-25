
import compileScripts_33 from './tools/compileScripts';
import copyPluginAssets_34 from './tools/copyPluginAssets.js';
import copyApplicationAssets_35 from './tools/copyApplicationAssets.js';
import electronRebuild_36 from './tools/electronRebuild.js';
import electronBuilder_37 from './tools/electronBuilder.js';
import tsc_38 from '@joplin/tools/gulp/tasks/tsc';
import updateIgnoredTypeScriptBuild_39 from '@joplin/tools/gulp/tasks/updateIgnoredTypeScriptBuild';
import buildScriptIndexes_40 from '@joplin/tools/gulp/tasks/buildScriptIndexes';
import gulp from 'gulp';
import utils from '@joplin/tools/gulp/utils';
import compileSass from '@joplin/tools/compileSass';
import compilePackageInfo from '@joplin/tools/compilePackageInfo';
import buildDefaultPlugins from '@joplin/default-plugins/commands/buildAll';
import copy7Zip from './tools/copy7Zip';
import bundleJs from './tools/bundleJs';
import { remove } from 'fs-extra';
const tasks = {
	bundle: {
		fn: () => bundleJs(false),
	},
	// Bundles and computes additional information that can be analysed with
	// locally or with https://esbuild.github.io/analyze/.
	bundleWithStats: {
		fn: () => bundleJs(true),
	},
	compileScripts: {
		fn: compileScripts_33,
	},
	compilePackageInfo: {
		fn: async () => {
			await compilePackageInfo(`${__dirname}/package.json`, `${__dirname}/packageInfo.js`);
		},
	},
	copyPluginAssets: {
		fn: copyPluginAssets_34,
	},
	copyApplicationAssets: {
		fn: copyApplicationAssets_35,
	},
	electronRebuild: {
		fn: electronRebuild_36,
	},
	electronBuilder: {
		fn: electronBuilder_37,
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
	tsc: tsc_38,
	updateIgnoredTypeScriptBuild: updateIgnoredTypeScriptBuild_39,
	buildScriptIndexes: buildScriptIndexes_40,
	compileSass: {
		fn: async () => {
			await compileSass(
				`${__dirname}/style.scss`,
				`${__dirname}/style.min.css`,
			);
		},
	},
};

utils.registerGulpTasks(gulp, tasks);

const buildBeforeStartParallel = gulp.parallel(
	'compileScripts',
	'compilePackageInfo',
	'copyPluginAssets',
	'copyApplicationAssets',
	'updateIgnoredTypeScriptBuild',
	'buildScriptIndexes',
	'compileSass',
);
const buildRequiresTsc = gulp.series('bundle');

gulp.task('before-start', gulp.series(
	buildRequiresTsc,
	buildBeforeStartParallel,
));
gulp.task('before-dist', buildRequiresTsc);

// Since "build" runs before "tsc", exclude tasks that require
// other packages to be built (i.e. don't include buildRequiresTsc).
const buildSequential = [
	buildBeforeStartParallel,
	'copyDefaultPluginsAssets',
	'buildDefaultPlugins',
];

gulp.task('build', gulp.series(buildSequential));
