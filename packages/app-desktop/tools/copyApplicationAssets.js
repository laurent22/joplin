const { writeFile, copy, mkdirp, remove } = require('fs-extra');
const glob = require('glob');
const { resolve, basename } = require('path');
const { dirname } = require('@joplin/tools/gulp/utils');

const rootDir = resolve(__dirname, '../../..');
const nodeModulesDir = resolve(__dirname, '../node_modules');

function stripOffRootDir(path) {
	if (path.startsWith(rootDir)) return path.substr(rootDir.length + 1);
	return path;
}

const msleep = async (ms) => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
};

// Running this script on CI is very unreliable. It fails with errors that don't
// make much sense, such as:
//
//     [Error: ENOENT: no such file or directory, copyfile
//     '/home/runner/work/joplin/joplin/Assets/TinyMCE/langs/ro_RO.js' ->
//     '/home/runner/work/joplin/joplin/packages/app-desktop/vendor/lib/tinymce/langs/ro_RO.js']
//
// (but "Assets/TinyMCE/langs/ro_RO.js" exists, since it's in the repo, and it's
// normal that "tinymce/langs/ro_RO.js" doesn't exist since we want to create
// it...)
//
// Another one, when trying to delete a directory:
//
//     ENOTEMPTY: directory not empty
//
// (also makes no sense since the point of calling `remove()` is to remove a
// directory that is not empty)
//
// Those errors are random - they may or may not happen on a CI run, and always
// on different files. Since they don't make sense and are seemingly impossible
// to fix, we instead implement a retry mechanism with exponential backoff. The
// failures are relatively rare so 5 attempts should be enough to ensure all CI
// runs succeed.
//
// It's possible the same technique should be added to copyPluginAssets too.

const withRetry = async (fn) => {
	for (let i = 0; i < 5; i++) {
		try {
			await fn();
			return;
		} catch (error) {
			console.warn(`withRetry: Failed calling function - will retry (${i})`, error);
			await msleep(1000 + i * 1000);
		}
	}

	throw new Error('withRetry: Could not run function after multiple attempts');
};

async function main() {
	const langSourceDir = resolve(__dirname, '../../../Assets/TinyMCE/langs');
	const buildLibDir = resolve(__dirname, '../vendor/lib');
	const buildDir = resolve(__dirname, '../build');

	const dirs = [
		'tinymce',
		'@fortawesome/fontawesome-free/webfonts',
		'roboto-fontface/fonts',
		'codemirror/theme',
		{
			src: langSourceDir,
			dest: `${buildLibDir}/tinymce/langs`,
		},
		{
			src: `${nodeModulesDir}/tesseract.js-core`,
			dest: `${buildDir}/tesseract.js-core`,
		},
	];

	const files = [
		'@fortawesome/fontawesome-free/css/all.min.css',
		'@joeattardi/emoji-button/dist/index.js',
		'codemirror/addon/dialog/dialog.css',
		'codemirror/lib/codemirror.css',
		'mark.js/dist/mark.min.js',
		'roboto-fontface/css/roboto/roboto-fontface.css',
		'smalltalk/css/smalltalk.css',
		'smalltalk/dist/smalltalk.min.js',
		'smalltalk/img/IDR_CLOSE_DIALOG_H.png',
		'smalltalk/img/IDR_CLOSE_DIALOG.png',
		{
			src: resolve(__dirname, '../../lib/services/plugins/sandboxProxy.js'),
			dest: `${buildLibDir}/@joplin/lib/services/plugins/sandboxProxy.js`,
		},
		{
			src: `${nodeModulesDir}/pdfjs-dist/build/pdf.worker.min.js`,
			dest: `${buildDir}/pdf.worker.min.js`,
		},
		{
			src: `${nodeModulesDir}/tesseract.js/dist/worker.min.js`,
			dest: `${buildDir}/tesseract.js/worker.min.js`,
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
				await withRetry(() => remove(destDir));
			} else {
				console.info(`Copying ${stripOffRootDir(sourceDir)} => ${stripOffRootDir(destDir)}`);
				await withRetry(() => mkdirp(destDir));
				await withRetry(() => copy(sourceDir, destDir, { overwrite: true }));
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

		await withRetry(() => mkdirp(dirname(destFile)));

		console.info(`Copying ${stripOffRootDir(sourceFile)} => ${stripOffRootDir(destFile)}`);
		await withRetry(() => copy(sourceFile, destFile, { overwrite: true }));
	}

	const supportedLocales = glob.sync(`${langSourceDir}/*.js`).map(s => {
		s = basename(s).split('.');
		return s[0];
	});

	supportedLocales.sort();

	const content = `module.exports = ${JSON.stringify(supportedLocales, null, 2)}`;

	await writeFile(`${__dirname}/../gui/NoteEditor/NoteBody/TinyMCE/supportedLocales.js`, content, 'utf8');
}

module.exports = main;
