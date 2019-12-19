require('app-module-path').addPath(`${__dirname}`);

const fs = require('fs-extra');
const { dirname } = require('lib/path-utils');

const rootDir = __dirname;
const outputDir = `${rootDir}/rendererAssets`;

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
	const js = `module.exports = \`${buffer.toString('base64')}\`;`;
	const outputPath = `${outputDir}/${destPath}.base64.js`;
	await fs.mkdirp(dirname(outputPath));
	await fs.writeFile(outputPath, js);
	return {
		encoding: 'base64',
		name: destPath,
	};
}

async function main() {
	await fs.mkdirp(outputDir);

	const encodedFiles = [];
	const sourceAssetDir = `${rootDir}/node_modules/joplin-renderer/assets`;
	const files = walk(sourceAssetDir);

	for (const file of files) {
		const destFile = file.substr(sourceAssetDir.length + 1);
		encodedFiles.push(await encodeFile(file, destFile));
	}

	const indexJs = [];
	for (const file of encodedFiles) {
		indexJs.push(`'${file.name}': { data: require('./${file.name}'), encoding: '${file.encoding}' },`);
	}

	await fs.writeFile(`${outputDir}/index.js`, `module.exports = {\n${indexJs.join('\n')}\n};`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
