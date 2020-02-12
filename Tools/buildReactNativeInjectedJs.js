// React Native WebView cannot load external JS files, however it can load
// arbitrary JS via the injectedJavaScript property. So we use this to load external
// files: First here we convert the JS file to a plain string, and that string
// is then loaded by eg. the Mermaid plugin, and finally injected in the WebView.

const fs = require('fs-extra');

const cwd = process.cwd();
const outputDir = `${cwd}/lib/rnInjectedJs`;
const rnDir = `${__dirname}/../ReactNativeClient`;

async function copyJs(name, filePath) {
	const js = await fs.readFile(filePath, 'utf-8');
	const json = `module.exports = ${JSON.stringify(js)};`;
	const outputPath = `${outputDir}/${name}.js`;
	await fs.writeFile(outputPath, json);
}

async function main() {
	await fs.mkdirp(outputDir);
	await copyJs('webviewLib', `${rnDir}/lib/renderers/webviewLib.js`);
}

main(process.argv).catch((error) => {
	console.error(error);
	process.exit(1);
});
