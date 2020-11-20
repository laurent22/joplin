const utils = require('@joplin/tools/gulp/utils');

async function main() {
	const rootDir = `${__dirname}/..`;
	// TODO: should take from node_modules/@joplin/renderer
	const sourceDir = `${rootDir}/../../packages/renderer/assets`;
	const destDirs = [
		`${rootDir}/gui/note-viewer/pluginAssets`,
		`${rootDir}/pluginAssets`,
	];

	for (const destDir of destDirs) {
		console.info(`Copying to ${destDir}`);
		await utils.copyDir(sourceDir, destDir);
	}
}

module.exports = main;
