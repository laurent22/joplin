const fs = require('fs-extra');
const { execCommand } = require('./tool-utils.js');
const md5File = require('md5-file/promise');
const glob = require('glob');

const clipperDir   = `${__dirname}/../Clipper`;
const tmpSourceDirName = 'Clipper-source';

async function copyDir(baseSourceDir, sourcePath, baseDestDir) {
	await fs.mkdirp(`${baseDestDir}/${sourcePath}`);
	await fs.copy(`${baseSourceDir}/${sourcePath}`, `${baseDestDir}/${sourcePath}`);
}

async function copyToDist(distDir) {
	await copyDir(clipperDir, 'popup/build', distDir);
	await copyDir(clipperDir, 'content_scripts', distDir);
	await copyDir(clipperDir, 'icons', distDir);
	await fs.copy(`${clipperDir}/background.js`, `${distDir}/background.js`);
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

async function createSourceZip() {
	const tmpSourceDir = `${__dirname}/../${tmpSourceDirName}`;
	const filename = 'joplin-webclipper-source.zip';
	const filePath = `${clipperDir}/dist/${filename}`;
	console.info('Creating source tarball for code validation...');
	console.info(`Chdir: ${clipperDir}/..`);
	process.chdir(`${clipperDir}/..`);
	console.info(await execCommand(`rm -f "${filePath}"`));
	console.info(await execCommand(`rsync -a --delete --exclude 'node_modules/' --exclude 'build/' --exclude 'dist/' "${clipperDir}/" "${tmpSourceDir}/"`));
	console.info(await execCommand(`7z a -tzip ${filename} "${tmpSourceDirName}"`));
	console.info(await execCommand(`mv ${filename} "${clipperDir}/dist/" && rm -rf "${tmpSourceDirName}"`));

	return filePath;
}

async function compareFiles(path1, path2) {
	return await md5File(path1) === await md5File(path2);
}

async function compareDir(dir1, dir2) {
	console.info(`Comparing directories ${dir1} to ${dir2}`);

	const globOptions = {
		ignore: [
			'**/node_modules/**',
			'**/.git/**',
		],
	};

	const filterFiles = (f) => {
		const stat = fs.statSync(f);
		return !stat.isDirectory();
	};

	const files1 = glob.sync(`${dir1}/**/*`, globOptions).filter(filterFiles).map(f => f.substr(dir1.length + 1));
	const files2 = glob.sync(`${dir2}/**/*`, globOptions).filter(filterFiles).map(f => f.substr(dir2.length + 1));

	const missingFiles1 = [];
	const missingFiles2 = [];
	const canBeMissing1 = [];
	const canBeMissing2 = ['manifest.json'];
	const differentFiles = [];
	for (const f of files1) {
		if (!files2.includes(f)) {
			if (canBeMissing2.includes(f)) continue;
			missingFiles2.push(f);
			continue;
		}

		const sameFiles = await compareFiles(`${dir1}/${f}`, `${dir2}/${f}`);
		if (!sameFiles) differentFiles.push(f);
	}

	for (const f of files2) {
		if (!files1.includes(f)) {
			if (canBeMissing1.includes(f)) continue;
			missingFiles1.push(f);
		}
	}

	if (missingFiles1.length) console.info(`Missing from ${dir1}:`, missingFiles1);
	if (missingFiles2.length) console.info(`Missing from ${dir2}:`, missingFiles2);
	if (differentFiles.length) console.info(`Different files: ${differentFiles}`);

	if (!differentFiles.length && !missingFiles1.length && !missingFiles2.length) {
		console.info('All files are equal');
		return true;
	}

	return false;
}

async function checkSourceZip(sourceZip, compiledZip) {
	const tmpDir = `${require('os').tmpdir()}/${Date.now()}`;

	console.info(`Checking source ZIP in ${tmpDir}`);

	const sourceDir = `${tmpDir}/source`;
	const compiledDir = `${tmpDir}/compiled`;
	await fs.mkdirp(sourceDir);
	await fs.mkdirp(compiledDir);

	process.chdir(sourceDir);
	console.info(await execCommand(`cp "${sourceZip}" .`));
	console.info(await execCommand(`unzip "${sourceZip}"`));
	process.chdir(`${sourceDir}/Clipper-source/popup`);
	console.info(await execCommand('npm install'));

	process.chdir(compiledDir);
	console.info(await execCommand(`cp "${compiledZip}" .`));
	console.info(await execCommand(`unzip "${compiledZip}"`));

	const areEqual = await compareDir(`${sourceDir}/Clipper-source/popup/build`, `${compiledDir}/popup/build`);

	if (areEqual) {
		await fs.remove(sourceDir);
		await fs.remove(compiledDir);
	}
}

async function main() {
	console.info(await execCommand('git pull'));

	const newVersion = await updateManifestVersionNumber(`${clipperDir}/manifest.json`);

	console.info('Building extension...');
	process.chdir(`${clipperDir}/popup`);
	// SKIP_PREFLIGHT_CHECK avoids the error "There might be a problem with the project dependency tree." due to eslint 5.12.0 being
	// installed by CRA and 6.1.0 by us. It doesn't affect anything though, and the behaviour of the preflight
	// check is buggy so we can ignore it.
	console.info(await execCommand(`rm -rf ${clipperDir}/popup/build`));
	console.info(await execCommand('npm run build'));

	const dists = {
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

	for (let distName in dists) {
		const dist = dists[distName];
		const distDir = `${clipperDir}/dist/${distName}`;
		await fs.remove(distDir);
		await fs.mkdirp(distDir);
		await copyToDist(distDir);

		const manifestText = await fs.readFile(`${distDir}/manifest.json`, 'utf-8');
		let manifest = JSON.parse(manifestText);
		manifest.name = 'Joplin Web Clipper';
		if (dist.removeManifestKeys) manifest = dist.removeManifestKeys(manifest);
		await fs.writeFile(`${distDir}/manifest.json`, JSON.stringify(manifest, null, 4));

		process.chdir(distDir);
		console.info(await execCommand(`rm -f "${distName}.zip"`));
		console.info(await execCommand(`7z a -tzip ${distName}.zip *`));
		console.info(await execCommand(`mv ${distName}.zip ..`));

		dists[distName].outputPath = `${clipperDir}/dist/${distName}.zip`;
	}

	const sourceZip = await createSourceZip();
	await checkSourceZip(sourceZip, dists.firefox.outputPath);

	process.chdir(clipperDir);
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
