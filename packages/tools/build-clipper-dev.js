const fs = require('fs-extra');
const path = require('path');

const clipperDir = path.resolve(__dirname, '../app-clipper');

async function copyDir(baseSourceDir, dirName, baseDestDir) {
	// Create new directories at the destination directory that contains the unpacked extension
	await fs.mkdirp(`${baseDestDir}/${dirName}`);
	await fs.copy(`${baseSourceDir}/${dirName}`, `${baseDestDir}/${dirName}`);
}

async function copyToDev(devDir) {
	const extensionContent = {
		files: ['background.js', 'manifest.json'],
		directories: ['popup/build', 'content_scripts', 'icons'],
	};
	const { files, directories } = extensionContent;
	for (const dir of directories) {
		await copyDir(clipperDir, dir, devDir);
	}
	for (const file of files) {
		await fs.copy(`${clipperDir}/${file}`, `${devDir}/${file}`);
	}
	await fs.remove(`${devDir}/popup/build/manifest.json`);
}

async function main() {
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
		const devDir = `${clipperDir}/dev/${browser}`;
		console.log(devDir);
		await fs.remove(devDir);
		await fs.mkdirp(devDir);
		await copyToDev(devDir);
		const manifestText = await fs.readFile(`${devDir}/manifest.json`, 'utf-8');
		let manifest = JSON.parse(manifestText);
		// Remove the `persistent` key in Firefox extension and `gecko` key in Chrome extension to avoid getting rejected by the respective browser.
		if (configMethod.removeManifestKeys) manifest = configMethod.removeManifestKeys(manifest);
		await fs.writeFile(`${devDir}/manifest.json`, JSON.stringify(manifest, null, 4));
	}
}

main().then(() => console.log(`Created unpacked extension for Chrome and Firefox at ${clipperDir}/dev directory`))
	.catch(error => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
