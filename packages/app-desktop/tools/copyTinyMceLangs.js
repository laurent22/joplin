const fs = require('fs-extra');
const glob = require('glob');
const utils = require('@joplin/tools/gulp/utils');

async function main() {
	const sourceDir = `${__dirname}/../../../Assets/TinyMCE/langs`;
	const destDir = `${__dirname}/../node_modules/tinymce/langs`;
	console.info(`Copying ${sourceDir} => ${destDir}`);
	await utils.copyDir(sourceDir, destDir);

	await utils.copyFile(`${__dirname}/../custom/tinymce.js`, `${__dirname}/../node_modules/tinymce/tinymce.js`);
	await utils.copyFile(`${__dirname}/../custom/searchreplace_plugin.js`, `${__dirname}/../node_modules/tinymce/plugins/searchreplace/plugin.js`);
	await utils.copyFile(`${__dirname}/../custom/lists_plugin.js`, `${__dirname}/../node_modules/tinymce/plugins/lists/plugin.js`);
	await utils.copyFile(`${__dirname}/../custom/link_plugin.js`, `${__dirname}/../node_modules/tinymce/plugins/link/plugin.js`);

	const supportedLocales = glob.sync(`${sourceDir}/*.js`).map(s => {
		s = s.split('/');
		s = s[s.length - 1];
		s = s.split('.');
		return s[0];
	});

	const content = `module.exports = ${JSON.stringify(supportedLocales, null, 2)}`;

	await fs.writeFile(`${__dirname}/../gui/NoteEditor/NoteBody/TinyMCE/supportedLocales.js`, content, 'utf8');
}

module.exports = main;
