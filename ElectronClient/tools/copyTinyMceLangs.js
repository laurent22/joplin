const fs = require('fs-extra');

async function main() {
	const sourceDir = `${__dirname}/../../Modules/TinyMCE/langs`;
	const destDir = `${__dirname}/../node_modules/tinymce/langs`;
	console.info(`Copying ${sourceDir} => ${destDir}`);
	await fs.remove(destDir);
	await fs.mkdirp(destDir);
	await fs.copy(sourceDir, destDir);
}

module.exports = main;
