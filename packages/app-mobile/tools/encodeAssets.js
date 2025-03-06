const utils = require('@joplin/tools/gulp/utils');
const { toForwardSlashes } = require('@joplin/utils/path');
const fs = require('fs-extra');
const path = require('path');
const md5 = require('md5');

const rootDir = `${__dirname}/..`;
const outputDir = `${rootDir}/pluginAssets`;

const walk = function(dir) {
	let results = [];
	const list = fs.readdirSync(dir);
	// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
	list.forEach((file) => {
		file = `${dir}/${file}`;
		const stat = fs.statSync(file);
		if (stat && stat.isDirectory()) {
			results = results.concat(walk(file));
		} else {
			results.push(file);
		}
	});
	return results;
};

const readAsBase64 = async (path, mime) => {
	let buffer;
	// Normalize line endings to prevent hashes from changing when recompiling on
	// Windows (if originally compiled on Unix).
	if (mime === 'application/javascript' || mime.startsWith('text/')) {
		const file = await fs.readFile(path, 'utf-8');
		buffer = Buffer.from(file.replace(/\r\n/g, '\n'), 'utf-8');
	} else {
		buffer = await fs.readFile(path);
	}

	return buffer.toString('base64');
};

async function encodeFile(sourcePath, destPath) {
	const ext = utils.fileExtension(sourcePath).toLowerCase();
	let mime = 'application/octet-stream';
	if (ext === 'js') mime = 'application/javascript';
	if (ext === 'css') mime = 'text/css';

	const base64Data = await readAsBase64(sourcePath, mime);
	const hash = md5(base64Data);
	const js = `module.exports = \`${base64Data}\`;`;
	const outputPath = `${outputDir}/${destPath}.base64.js`;
	console.info(`Encoding "${sourcePath}" => "${outputPath}"`);
	await utils.mkdirp(utils.dirname(outputPath));
	await fs.writeFile(outputPath, js);

	return {
		encoding: 'base64',
		name: destPath,
		encodedName: `${destPath}.base64.js`,
		mime: mime,
		hash: hash,
	};
}

async function main() {
	for (let i = 0; i < 3; i++) {
		try {
			await fs.remove(outputDir);
			await utils.mkdirp(outputDir);

			const encodedFiles = [];
			const sourceAssetDir = `${rootDir}/../renderer/assets`;
			const files = walk(sourceAssetDir);

			for (const file of files) {
				const destFile = file.substr(sourceAssetDir.length + 1);
				encodedFiles.push(await encodeFile(file, destFile));
			}

			const hashes = [];
			const indexJs = [];
			for (const file of encodedFiles) {
				indexJs.push(`'${file.name}': { data: require('./${file.encodedName}'), mime: '${file.mime}', encoding: '${file.encoding}' },`);
				hashes.push(file.hash);
			}

			const hash = md5(hashes.join(''));

			await fs.writeFile(`${outputDir}/index.js`, `module.exports = {\nhash:"${hash}", files: {\n${indexJs.join('\n')}\n}\n};`);
			await fs.writeFile(`${outputDir}/index.web.js`, `module.exports = ${JSON.stringify({
				hash,
				files: files.map(file => toForwardSlashes(path.relative(sourceAssetDir, file))),
			})}`);

			return;
		} catch (error) {
			// Although it makes no sense, the above function `encodeFile()` sometimes fails on CI
			// with error "DEST does not exist", which of course it doesn't
			// since we are trying to create it. So here we retry when it happens.
			//
			// Full error:
			//
			// Encoding "/home/runner/work/joplin/joplin/packages/app-mobile/tools/../../renderer/assets/katex/fonts/KaTeX_Math-BoldItalic.woff2" => "/home/runner/work/joplin/joplin/packages/app-mobile/tools/../pluginAssets/katex/fonts/KaTeX_Math-BoldItalic.woff2.base64.js"
			// 'encodeAssets' errored after 115 ms
			// Error: ENOENT: no such file or directory, open '/home/runner/work/joplin/joplin/packages/app-mobile/tools/../pluginAssets/katex/fonts/KaTeX_Math-BoldItalic.woff2.base64.js'
			//
			// On CI we also get the below random error, which also doesn't make sense since `remove()`
			// should delete the directory whether it's empty or not.
			//
			// Error: ENOTEMPTY: directory not empty, rmdir '/Users/runner/work/joplin/joplin/packages/app-mobile/tools/../pluginAssets'

			console.warn(`Could not encode assets (${i}). Will try again...`);
			console.warn('Error was:', error);
			await utils.msleep(1000 + 1000 * i);
			continue;
		}
	}

	throw new Error('Could not encode file after multiple attempts. See above for errors.');
}

module.exports = main;
