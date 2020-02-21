require('app-module-path').addPath(`${__dirname}`);

const fs = require('fs-extra');

const rootDir = `${__dirname}/..`;
const sourceDir = `${rootDir}/../ReactNativeClient/lib/joplin-renderer/assets`;
const destDir = `${rootDir}/gui/note-viewer/pluginAssets`;

async function main() {
	await fs.remove(destDir);
	await fs.mkdirp(destDir);
	await fs.copy(sourceDir, destDir);
}

module.exports = main;
