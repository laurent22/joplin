const fs = require('fs-extra');
const glob = require('glob');
const { copyDir, dirname, copyFile, mkdir } = require('@joplin/tools/gulp/utils');

// const rootDir = `${__dirname}/../../..`;
// const nodeModulesDir = `${rootDir}/node_modules`;
const nodeModulesDir = `${__dirname}/../node_modules`;

async function main() {
	const langSourceDir = `${__dirname}/../../../Assets/TinyMCE/langs`;

	const dirs = [
		'tinymce',
		'@fortawesome/fontawesome-free/webfonts',
		'roboto-fontface/fonts',
		'codemirror/theme',
		{
			src: langSourceDir,
			dest: `${__dirname}/../build/lib/tinymce/langs`,
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
		'@joplin/lib/services/plugins/sandboxProxy.js',
	];

	for (const dir of dirs) {
		let sourceDir, destDir;

		if (typeof dir !== 'string') {
			sourceDir = dir.src;
			destDir = dir.dest;
		} else {
			sourceDir = `${nodeModulesDir}/${dir}`;
			destDir = `${__dirname}/../build/lib/${dir}`;
		}

		console.info(`Copying ${sourceDir} => ${destDir}`);
		await mkdir(destDir);
		await copyDir(sourceDir, destDir);
	}

	for (const file of files) {
		let sourceDir, destDir;

		if (Array.isArray(file)) {
			throw new Error('TODO');
		} else {
			sourceDir = `${nodeModulesDir}/${file}`;
			destDir = `${__dirname}/../build/lib/${file}`;
		}

		await mkdir(dirname(destDir));

		console.info(`Copying ${sourceDir} => ${destDir}`);
		await copyFile(sourceDir, destDir);
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
