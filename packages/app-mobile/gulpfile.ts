

import encodeAssets_93 from './tools/encodeAssets';
import { default as default_94 } from './tools/copyAssets';
import podInstall_95 from './tools/podInstall';
import gulp from 'gulp';
import utils from '@joplin/tools/gulp/utils';
import compilePackageInfo from '@joplin/tools/compilePackageInfo';
import injectedJsGulpTasks from './tools/buildInjectedJs/gulpTasks';
const tasks = {
	encodeAssets: {
		fn: encodeAssets_93,
	},
	copyWebAssets: {
		fn: default_94,
	},
	compilePackageInfo: {
		fn: async () => {
			await compilePackageInfo(`${__dirname}/package.json`, `${__dirname}/packageInfo.js`);
		},
	},

	...injectedJsGulpTasks,
	podInstall: {
		fn: podInstall_95,
	},
};

utils.registerGulpTasks(gulp, tasks);

gulp.task('buildInjectedJs', gulp.series(
	'beforeBundle',
	'buildBundledJs',
	'copyWebviewLib',
));

gulp.task('watchInjectedJs', gulp.series(
	'beforeBundle',
	'copyWebviewLib',
	'watchBundledJs',
));

gulp.task('build', gulp.series(
	'compilePackageInfo',
	'buildInjectedJs',
	'copyWebAssets',
	'encodeAssets',
	'podInstall',
));
