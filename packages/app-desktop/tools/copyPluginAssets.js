const { copy, mkdirp, remove } = require('fs-extra');

async function main() {
	const rootDir = `${__dirname}/..`;

	const sourceDir = `${rootDir}/../../packages/renderer/assets`;
	const destDirs = [
		`${rootDir}/gui/note-viewer/pluginAssets`,
		`${rootDir}/pluginAssets`,
	];

	for (const action of ['delete', 'copy']) {
		for (const destDir of destDirs) {
			if (action === 'delete') {
				await remove(destDir);
			} else {
				console.info(`Copying to ${destDir}`);
				await mkdirp(destDir);
				await copy(sourceDir, destDir, { overwrite: true });
			}
		}
	}
}

module.exports = main;
