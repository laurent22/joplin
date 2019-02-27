const fs = require('fs-extra');

const cwd = process.cwd();
const outputDir = cwd + '/lib/rnInjectedJs';

async function copyJs(name, filePath) {
	const js = await fs.readFile(filePath, 'utf-8');
	const json = 'module.exports = ' + JSON.stringify(js) + ';';
	const outputPath = outputDir + '/' + name + '.js';
	await fs.writeFile(outputPath, json);
}

async function main(argv) {
	await fs.mkdirp(outputDir);
	await copyJs('mermaid', __dirname + '/node_modules/mermaid/dist/mermaid.min.js');	
}

main(process.argv).catch((error) => {
	console.error(error);
	process.exit(1);
});