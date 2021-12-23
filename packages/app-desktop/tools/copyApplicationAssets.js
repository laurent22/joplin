const { writeFile, copy, mkdirp, remove } = require('fs-extra');
const glob = require('glob');
const { resolve } = require('path');
const { dirname } = require('@joplin/tools/gulp/utils');

const nodeModulesDir = resolve(__dirname, '../node_modules');

async function main() {
	const langSourceDir = resolve(__dirname, '../../../Assets/TinyMCE/langs');
	const buildLibDir = resolve(__dirname, '../vendor/lib');

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

	// First we delete all the destination directories, then we copy the files.
	// It seems there's a race condition if we delete then copy right away.
	for (const action of ['delete', 'copy']) {
		for (const dir of dirs) {
			let sourceDir, destDir;

			if (typeof dir !== 'string') {
				sourceDir = dir.src;
				destDir = dir.dest;
			} else {
				sourceDir = `${nodeModulesDir}/${dir}`;
				destDir = `${buildLibDir}/${dir}`;
			}

			if (action === 'delete') {
				await remove(destDir);
			} else {
				console.info(`Copying ${sourceDir} => ${destDir}`);
				await mkdirp(destDir);
				await copy(sourceDir, destDir, { overwrite: true });
			}
		}
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

		await mkdirp(dirname(destFile));

		console.info(`Copying ${sourceFile} => ${destFile}`);
		await copy(sourceFile, destFile, { overwrite: true });
	}

	const supportedLocales = glob.sync(`${langSourceDir}/*.js`).map(s => {
		s = s.split('/');
		s = s[s.length - 1];
		s = s.split('.');
		return s[0];
	});

	const content = `module.exports = ${JSON.stringify(supportedLocales, null, 2)}`;

	await writeFile(`${__dirname}/../gui/NoteEditor/NoteBody/TinyMCE/supportedLocales.js`, content, 'utf8');
}

module.exports = main;
