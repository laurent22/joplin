const fs = require('fs-extra');

async function main() {
	const rootDir = `${__dirname}/..`;
	const sourceDir = `${rootDir}/../ReactNativeClient/lib/joplin-renderer/assets`;
	const destDirs = [
		`${rootDir}/gui/note-viewer/pluginAssets`,
		`${rootDir}/pluginAssets`,
	];

	for (const destDir of destDirs) {
		console.info(`Copying to ${destDir}`);
		await fs.remove(destDir);
		await fs.mkdirp(destDir);
		await fs.copy(sourceDir, destDir);
	}
}

module.exports = main;
