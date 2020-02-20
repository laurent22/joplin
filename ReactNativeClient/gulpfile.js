const gulp = require('gulp');
// const execa = require('execa');
const utils = require('../Tools/gulp/utils');

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
};

// tasks.jetify = {
// 	fn: async () => {
// 		try {
// 			const promise = execa('npx', ['jetify']);
// 			promise.stdout.pipe(process.stdout);
// 			await promise;
// 		} catch (error) {
// 			console.warn('Jetify failed:', error);
// 		}
// 		return Promise.resolve();
// 	},
// };

utils.registerGulpTasks(gulp, tasks);

gulp.task('build', gulp.series(
	'buildReactNativeInjectedJs',
	// 'jetify',
	'encodeAssets',
	'podInstall',
));
