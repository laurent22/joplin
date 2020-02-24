const fs = require('fs-extra');
const { execCommand } = require('./tool-utils.js');

const clipperDir   = `${__dirname}/../Clipper`;
const tmpSourceDir = `${__dirname}/../Clipper-source`;

async function copyDir(baseSourceDir, sourcePath, baseDestDir) {
	await fs.mkdirp(`${baseDestDir}/${sourcePath}`);
	await fs.copy(`${baseSourceDir}/${sourcePath}`, `${baseDestDir}/${sourcePath}`);
}

async function copyToDist(distDir) {
	await copyDir(clipperDir, 'popup/build', distDir);
	await copyDir(clipperDir, 'content_scripts', distDir);
	await copyDir(clipperDir, 'icons', distDir);
	await fs.copy(`${clipperDir}/background.js`, `${distDir}/background.js`);
	await fs.copy(`${clipperDir}/main.js`, `${distDir}/main.js`);
	await fs.copy(`${clipperDir}/manifest.json`, `${distDir}/manifest.json`);

	await fs.remove(`${distDir}/popup/build/manifest.json`);
}

async function updateManifestVersionNumber(manifestPath) {
	const manifestText = await fs.readFile(manifestPath, 'utf-8');
	let manifest = JSON.parse(manifestText);
	let v = manifest.version.split('.');
	const buildNumber = Number(v.pop()) + 1;
	v.push(buildNumber);
	manifest.version = v.join('.');
	console.info(`New version: ${manifest.version}`);
	await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4));
	return manifest.version;
}

async function main() {
	console.info(await execCommand('git pull'));

	const newVersion = await updateManifestVersionNumber(`${clipperDir}/manifest.json`);

	console.info('Building extension...');
	process.chdir(`${clipperDir}/popup`);
	// SKIP_PREFLIGHT_CHECK avoids the error "There might be a problem with the project dependency tree." due to eslint 5.12.0 being
	// installed by CRA and 6.1.0 by us. It doesn't affect anything though, and the behaviour of the preflight
	// check is buggy so we can ignore it.
	console.info(await execCommand('npm run build'));

	const dists = [
		{
			dir: `${clipperDir}/dist/chrome`,
			name: 'chrome',
			removeManifestKeys: (manifest) => {
				manifest = Object.assign({}, manifest);
				delete manifest.applications;
				return manifest;
			},
		},
		{
			dir: `${clipperDir}/dist/firefox`,
			name: 'firefox',
			removeManifestKeys: (manifest) => {
				manifest = Object.assign({}, manifest);
				delete manifest.background.persistent;
				return manifest;
			},
		},
	];

	for (let i = 0; i < dists.length; i++) {
		const dist = dists[i];
		await fs.remove(dist.dir);
		await fs.mkdirp(dist.dir);
		await copyToDist(dist.dir);

		const manifestText = await fs.readFile(`${dist.dir}/manifest.json`, 'utf-8');
		let manifest = JSON.parse(manifestText);
		manifest.name = 'Joplin Web Clipper';
		if (dist.removeManifestKeys) manifest = dist.removeManifestKeys(manifest);
		await fs.writeFile(`${dist.dir}/manifest.json`, JSON.stringify(manifest, null, 4));

		process.chdir(dist.dir);
		console.info(await execCommand(`7z a -tzip ${dist.name}.zip *`));
		console.info(await execCommand(`mv ${dist.name}.zip ..`));
	}

	console.info('Creating source tarball for code validation...');
	process.chdir(`${clipperDir}/../`);
	console.info(await execCommand(`rsync -a --delete --exclude 'node_modules/' --exclude 'build/' --exclude 'dist/' ${clipperDir}/ ${tmpSourceDir}/`));
	console.info(await execCommand('7z a -tzip joplin-webclipper-source.zip joplin-webclipper-source'));
	console.info(await execCommand(`mv joplin-webclipper-source.zip ${clipperDir}/dist/ && rm -rf joplin-webclipper-source`));

	console.info(await execCommand('git add -A'));
	console.info(await execCommand(`git commit -m "Clipper release v${newVersion}"`));
	console.info(await execCommand(`git tag clipper-${newVersion}`));
	console.info(await execCommand('git push'));
	console.info(await execCommand('git push --tags'));
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
