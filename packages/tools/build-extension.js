const fs = require('fs-extra');
const path = require('path');

const clipperDir = path.resolve(__dirname, '../app-clipper');

async function copyDir(baseSourceDir, dirName, baseDestDir) {
	// Example: `app-clipper/content_scripts` will be copied to to `app-clipper/build/chrome/content_scripts` and `app-clipper/build/firefox/content_scripts.
	await fs.mkdirp(`${baseDestDir}/${dirName}`);
	// Copy
	await fs.copy(`${baseSourceDir}/${dirName}`, `${baseDestDir}/${dirName}`);
}

async function copyToDestinationFolder(destinationDirectory) {
	const extensionContent = {
		files: ['background.js', 'manifest.json'],
		directories: ['popup/build', 'content_scripts', 'icons'],
	};
	const { files, directories } = extensionContent;
	for (const dir of directories) {
		await copyDir(clipperDir, dir, destinationDirectory);
	}
	for (const file of files) {
		await fs.copy(`${clipperDir}/${file}`, `${destinationDirectory}/${file}`);
	}
	await fs.remove(`${destinationDirectory}/popup/build/manifest.json`);
}

async function main() {
	// Methods to remove the `persistent` key in Firefox extension and `gecko` key in Chrome extension
	const manifestConfig = {
		chrome: {
			removeManifestKeys: (manifest) => {
				manifest = Object.assign({}, manifest);
				delete manifest.applications;
				return manifest;
			},
		},
		firefox: {
			removeManifestKeys: (manifest) => {
				manifest = Object.assign({}, manifest);
				delete manifest.background.persistent;
				return manifest;
			},
		},
	};
	for (const browser in manifestConfig) {
		const configMethod = manifestConfig[browser];
		const distDir = `${clipperDir}/build/${browser}`;
		// Delete the current build folder for the extension. Siliently exit if it doesn't exist.
		await fs.remove(distDir);
		// Create the build folder again.
		await fs.mkdirp(distDir);
		await copyToDestinationFolder(distDir);
		const manifestText = await fs.readFile(`${distDir}/manifest.json`, 'utf-8');
		let manifest = JSON.parse(manifestText);
		// Call the methods to remove keys that will be unrecognized by either Chrome or Firefox to avoid getting error warning.
		if (configMethod.removeManifestKeys) { manifest = configMethod.removeManifestKeys(manifest); }
		await fs.writeFile(
			`${distDir}/manifest.json`,
			JSON.stringify(manifest, null, 4)
		);
	}
}

main()
	.then(() =>
		console.log(
			`Created unpacked extension for Chrome and Firefox at ${clipperDir}/dev directory`
		)
	)
	.catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
