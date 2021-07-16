// React Native WebView cannot load external JS files, however it can load
// arbitrary JS via the injectedJavaScript property. So we use this to load external
// files: First here we convert the JS file to a plain string, and that string
// is then loaded by eg. the Mermaid plugin, and finally injected in the WebView.

const fs = require('fs-extra');
const { execCommand2, rootDir } = require('@joplin/tools/tool-utils');
const mobileDir = `${rootDir}/packages/app-mobile`;
const outputDir = `${mobileDir}/lib/rnInjectedJs`;
const codeMirrorBundleFile = `${mobileDir}/components/NoteEditor/CodeMirror.bundle.min.js`;

async function copyJs(name, filePath) {
	const js = await fs.readFile(filePath, 'utf-8');
	const json = `module.exports = ${JSON.stringify(js)};`;
	const outputPath = `${outputDir}/${name}.js`;
	await fs.writeFile(outputPath, json);
}

async function buildCodeMirrorBundle() {
	const sourceFile = `${mobileDir}/components/NoteEditor/CodeMirror.ts`;
	const fullBundleFile = `${mobileDir}/components/NoteEditor/CodeMirror.bundle.js`;
	await execCommand2(`./node_modules/rollup/dist/bin/rollup "${sourceFile}" --name codeMirrorBundle -f iife -o "${fullBundleFile}" -p @rollup/plugin-node-resolve -p @rollup/plugin-typescript`);
	await execCommand2(`./node_modules/uglify-js/bin/uglifyjs --compress -o "${codeMirrorBundleFile}" -- "${fullBundleFile}"`);
}

async function main() {
	await fs.mkdirp(outputDir);
	await buildCodeMirrorBundle();
	await copyJs('webviewLib', `${mobileDir}/node_modules/@joplin/lib/renderers/webviewLib.js`);
	await copyJs('CodeMirror.bundle', `${mobileDir}/components/NoteEditor/CodeMirror.bundle.min.js`);
}

module.exports = main;
