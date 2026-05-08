import BundledFile from './BundledFile';
import { mkdirp } from 'fs-extra';
import { mobileDir, outputDir } from './constants';
import copyAssets from './copyAssets';
import { readdir, existsSync } from 'fs-extra';
import { join } from 'path';

const getBundles = async () => {
	// All folders in the contentScripts/ directories are bundles
	const contentScriptDir = `${mobileDir}/contentScripts/`;
	const bundles = [];

	for (const folderOrFileName of await readdir(contentScriptDir)) {
		// Only check subfolders
		if (folderOrFileName.includes('.')) continue;
		// Skip utilities shared between bundles
		if (folderOrFileName === 'utils') continue;

		const bundlePath = join(contentScriptDir, folderOrFileName);
		const indexPath = join(bundlePath, 'contentScript', 'index.ts');
		const contentScriptPath = existsSync(indexPath) ? indexPath : join(bundlePath, 'contentScript.ts');
		bundles.push(new BundledFile(folderOrFileName, contentScriptPath));
	}

	// Bundled JS may also exist within the components/ directory:
	bundles.push(new BundledFile(
		'pluginBackgroundPage',
		`${mobileDir}/components/plugins/backgroundPage/pluginRunnerBackgroundPage.ts`,
	));

	return bundles;
};

const gulpTasks = {
	beforeBundle: {
		fn: () => mkdirp(outputDir),
	},
	buildBundledJs: {
		fn: async () => {
			for (const bundle of await getBundles()) {
				await bundle.build();
			}
		},
	},
	watchBundledJs: {
		fn: async () => {
			const watchPromises = [];
			for (const bundle of await getBundles()) {
				watchPromises.push(bundle.startWatching());
			}
			await Promise.all(watchPromises);
		},
	},
	copyWebviewLib: {
		fn: () => copyAssets('webviewLib', { js: `${mobileDir}/../lib/renderers/webviewLib.js` }),
	},
};

export default gulpTasks;
