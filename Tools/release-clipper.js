const fs = require('fs-extra');
const { execCommand } = require('./tool-utils.js');

const clipperDir = __dirname + '/../Clipper/joplin-webclipper';

async function copyDir(baseSourceDir, sourcePath, baseDestDir) {
	await fs.mkdirp(baseDestDir + '/' + sourcePath);
	await fs.copy(baseSourceDir + '/' + sourcePath, baseDestDir + '/' + sourcePath);
}

async function copyToDist(distDir) {
	await copyDir(clipperDir, 'popup/build', distDir);
	await copyDir(clipperDir, 'content_scripts', distDir);
	await copyDir(clipperDir, 'icons', distDir);
	await fs.copy(clipperDir + '/background.js', distDir + '/background.js');
	await fs.copy(clipperDir + '/main.js', distDir + '/main.js');
	await fs.copy(clipperDir + '/manifest.json', distDir + '/manifest.json');

	await fs.remove(distDir + '/popup/build/manifest.json');
}

async function main() {
	process.chdir(clipperDir + '/popup');

	console.info(await execCommand('npm run build'));

	const dists = [
		{
			dir: clipperDir + '/dist/chrometest',
			name: 'chrome',
		}
	];

	for (let i = 0; i < dists.length; i++) {
		const dist = dists[i];
		await copyToDist(dist.dir);
		process.chdir(dist.dir);
		console.info(await execCommand('7z a -tzip ' + dist.name + '.zip *'));
	}
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});