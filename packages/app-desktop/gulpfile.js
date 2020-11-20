const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');
const fs = require('fs-extra');

const tasks = {
	compileScripts: {
		fn: require('./tools/compileScripts'),
	},
	compilePackageInfo: {
		fn: require('./tools/compile-package-info.js'),
	},
	copyPluginAssets: {
		fn: require('./tools/copyPluginAssets.js'),
	},
	copyTinyMceLangs: {
		fn: require('./tools/copyTinyMceLangs.js'),
	},
	electronRebuild: {
		fn: require('./tools/electronRebuild.js'),
	},
	// compileExtensions: {
	// 	fn: require('@joplin/tools/gulp/tasks/compileExtensions.js'),
	// },
	// copyLib: require('@joplin/tools/gulp/tasks/copyLib'),
	tsc: require('@joplin/tools/gulp/tasks/tsc'),
	updateIgnoredTypeScriptBuild: require('@joplin/tools/gulp/tasks/updateIgnoredTypeScriptBuild'),

	linkReact: {
		fn: async () => {
			// React is a dependency of both the lib and app-desktop
			// packages, which cause a duplicate React issue. To go around
			// this, one way is to manually link the package.
			//
			// Note that React must also be unlinked in preinstall step
			// otherwise there will be permission errors when running
			// `lerna bootstrap`
			//
			// https://reactjs.org/warnings/invalid-hook-call-warning.html#duplicate-react
			process.chdir(__dirname);
			await fs.remove('./node_modules/react');
			await fs.remove('./node_modules/react-dom');
			await utils.execCommand('npm link ../lib/node_modules/react');
			await utils.execCommand('npm link ../lib/node_modules/react-dom');
		},
	},
};

utils.registerGulpTasks(gulp, tasks);

// const buildSeries = [
// 	// 'compileExtensions',
// 	// 'copyLib',
// ];

// On Windows also run tsc because `npm run watch` locks some folders
// which makes the copyPluginAssets command fail. For that reason,
// it's not possible to run watch on Windows while testing the desktop app.
// if (require('os').platform() === 'win32') {
// buildSeries.push('tsc');
// }

const buildParallel = [
	// gulp.series(...buildSeries),
	'compileScripts',
	'compilePackageInfo',
	'copyPluginAssets',
	'copyTinyMceLangs',
	'updateIgnoredTypeScriptBuild',
	// 'linkReact',
];

gulp.task('build', gulp.parallel(...buildParallel));
