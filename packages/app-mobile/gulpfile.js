const gulp = require('gulp');
const fs = require('fs-extra');
const utils = require('@joplin/tools/gulp/utils');

const tasks = {
	encodeAssets: {
		fn: require('./tools/encodeAssets'),
	},
	buildReactNativeInjectedJs: {
		fn: require('./tools/buildReactNativeInjectedJs'),
	},
	podInstall: {
		fn: require('./tools/podInstall'),
	},
	prepareRelease: {
		fn: require('./tools/prepareRelease'),
	},
	// clean: {
	// 	fn: require('./tools/clean'),
	// },
	linkReact: {
		fn: async () => {
			// React is a dependency of both the lib and app-desktop
			// packages, which cause a duplicate React issue. To go around
			// this, one way is to manually link the package.
			// https://reactjs.org/warnings/invalid-hook-call-warning.html#duplicate-react
			process.chdir(__dirname);
			await fs.remove('./node_modules/react');
			await utils.execCommand('npm link ../lib/node_modules/react');
		},
	},
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series(
	'buildReactNativeInjectedJs',
	'encodeAssets',
	// 'linkReact',
	'podInstall'
));
