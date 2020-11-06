const { copyDir } = require('@joplinapp/tools/gulp/utils');
const { rootDir, deleteLink, toSystemSlashes } = require('@joplinapp/tools/tool-utils');
const mobileDir = `${rootDir}/packages/app-mobile`;

module.exports = async function() {
	const dirsToCopy = [
		'fork-htmlparser2',
		'fork-sax',
		'lib',
		'renderer',
	];

	const destDir = `${mobileDir}/node_modules/@joplinapp`;

	for (const dir of dirsToCopy) {
		const destPath = toSystemSlashes(`${destDir}/${dir}`);
		const sourcePath = toSystemSlashes(`${rootDir}/packages/${dir}`);

		console.info(`Copying ${sourcePath} => ${destPath}`);

		// TODO: copy symlink so that it can be restored
		await deleteLink(destPath);
		await copyDir(sourcePath, destPath, {
			excluded: ['node_modules'],
		});
	}
};
