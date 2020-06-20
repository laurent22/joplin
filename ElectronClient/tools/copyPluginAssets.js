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

		try {
			await fs.remove(destDir);
			await fs.copy(sourceDir, destDir);
		} catch (error) {
			// These calls randomly fail on Windows when the folders are being
			// watch by TypeScript. As these files aren't always needed for
			// development, only print a warning.
			console.warn(`Could not copy to ${destDir}`, error);
		}
	}
}

module.exports = main;
