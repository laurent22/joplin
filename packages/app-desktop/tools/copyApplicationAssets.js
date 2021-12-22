const fs = require('fs-extra');
const glob = require('glob');
const { resolve } = require('path');
const { copyDir, dirname, copyFile, mkdir } = require('@joplin/tools/gulp/utils');

const nodeModulesDir = resolve(__dirname, '../node_modules');

async function main() {
	const langSourceDir = resolve(__dirname, '../../../Assets/TinyMCE/langs');
	const buildLibDir = resolve(__dirname, '../build/lib');

	const dirs = [
		'tinymce',
		'@fortawesome/fontawesome-free/webfonts',
		'roboto-fontface/fonts',
		'codemirror/theme',
		{
			src: langSourceDir,
			dest: `${buildLibDir}/tinymce/langs`,
		},
	];

	const files = [
		'@fortawesome/fontawesome-free/css/all.min.css',
		'react-datetime/css/react-datetime.css',
		'smalltalk/css/smalltalk.css',
		'roboto-fontface/css/roboto/roboto-fontface.css',
		'codemirror/lib/codemirror.css',
		'codemirror/addon/dialog/dialog.css',
		'@joeattardi/emoji-button/dist/index.js',
		'mark.js/dist/mark.min.js',
		{
			src: resolve(__dirname, '../../lib/services/plugins/sandboxProxy.js'),
			dest: `${buildLibDir}/@joplin/lib/services/plugins/sandboxProxy.js`,
		},
	];

	for (const dir of dirs) {
		let sourceDir, destDir;

		if (typeof dir !== 'string') {
			sourceDir = dir.src;
			destDir = dir.dest;
		} else {
			sourceDir = `${nodeModulesDir}/${dir}`;
			destDir = `${buildLibDir}/${dir}`;
		}

		console.info(`Copying ${sourceDir} => ${destDir}`);
		await mkdir(destDir);
		await copyDir(sourceDir, destDir);
	}

	for (const file of files) {
		let sourceFile, destFile;

		if (typeof file !== 'string') {
			sourceFile = file.src;
			destFile = file.dest;
		} else {
			sourceFile = `${nodeModulesDir}/${file}`;
			destFile = `${buildLibDir}/${file}`;
		}

		await mkdir(dirname(destFile));

		console.info(`Copying ${sourceFile} => ${destFile}`);
		await copyFile(sourceFile, destFile);
	}

	const supportedLocales = glob.sync(`${langSourceDir}/*.js`).map(s => {
		s = s.split('/');
		s = s[s.length - 1];
		s = s.split('.');
		return s[0];
	});

	const content = `module.exports = ${JSON.stringify(supportedLocales, null, 2)}`;

	await fs.writeFile(`${__dirname}/../gui/NoteEditor/NoteBody/TinyMCE/supportedLocales.js`, content, 'utf8');
}

module.exports = main;
