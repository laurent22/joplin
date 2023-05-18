const utils = require('@joplin/tools/gulp/utils');
const fs = require('fs-extra');
const md5 = require('md5');

const rootDir = `${__dirname}/..`;
const outputDir = `${rootDir}/pluginAssets`;

const walk = function(dir) {
	let results = [];
	const list = fs.readdirSync(dir);
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

async function encodeFile(sourcePath, destPath) {
	for (let i = 0; i < 3; i++) {
		try {
			const buffer = await fs.readFile(sourcePath);
			const hash = md5(buffer.toString('base64'));
			const js = `module.exports = \`${buffer.toString('base64')}\`;`;
			const outputPath = `${outputDir}/${destPath}.base64.js`;
			console.info(`Encoding "${sourcePath}" => "${outputPath}"`);
			await utils.mkdirp(utils.dirname(outputPath));
			await fs.writeFile(outputPath, js);

			const ext = utils.fileExtension(sourcePath).toLowerCase();
			let mime = 'application/octet-stream';
			if (ext === 'js') mime = 'application/javascript';
			if (ext === 'css') mime = 'text/css';

			return {
				encoding: 'base64',
				name: destPath,
				encodedName: `${destPath}.base64.js`,
				mime: mime,
				hash: hash,
			};
		} catch (error) {
			// Although it makes no sense, the above function sometimes fails on CI
			// with error "DEST does not exist", which of course it doesn't
			// since we are trying to create it. So here we retry when it happens.
			//
			// Full error:
			//
			// Encoding "/home/runner/work/joplin/joplin/packages/app-mobile/tools/../../renderer/assets/katex/fonts/KaTeX_Math-BoldItalic.woff2" => "/home/runner/work/joplin/joplin/packages/app-mobile/tools/../pluginAssets/katex/fonts/KaTeX_Math-BoldItalic.woff2.base64.js"
			// 'encodeAssets' errored after 115 ms
			// Error: ENOENT: no such file or directory, open '/home/runner/work/joplin/joplin/packages/app-mobile/tools/../pluginAssets/katex/fonts/KaTeX_Math-BoldItalic.woff2.base64.js'

			console.warn(`Could not encode file (${i}). Will try again...`);
			console.warn('Error was:', error);
			await utils.msleep(1000 + 1000 * i);
			continue;
		}
	}

	throw new Error('Could not encode file after multiple attempts. See above for errors.');
}

async function main() {
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
}

module.exports = main;
