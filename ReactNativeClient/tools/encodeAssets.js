const utils = require('../../Tools/gulp/utils');
const fs = require('fs-extra');
const md5 = require('md5');

const rootDir = `${__dirname}/..`;
const outputDir = `${rootDir}/pluginAssets`;

var walk = function(dir) {
	var results = [];
	var list = fs.readdirSync(dir);
	list.forEach(function(file) {
		file = `${dir}/${file}`;
		var stat = fs.statSync(file);
		if (stat && stat.isDirectory()) {
			results = results.concat(walk(file));
		} else {
			results.push(file);
		}
	});
	return results;
};

async function encodeFile(sourcePath, destPath) {
	const buffer = await fs.readFile(sourcePath);
	const hash = md5(buffer.toString('base64'));
	const js = `module.exports = \`${buffer.toString('base64')}\`;`;
	const outputPath = `${outputDir}/${destPath}.base64.js`;
	await fs.mkdirp(utils.dirname(outputPath));
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
}

async function main() {
	await fs.remove(outputDir);
	await fs.mkdirp(outputDir);

	const encodedFiles = [];
	const sourceAssetDir = `${rootDir}/lib/joplin-renderer/assets`;
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
