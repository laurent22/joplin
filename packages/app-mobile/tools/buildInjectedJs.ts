// React Native WebView cannot load external JS files, however it can load
// arbitrary JS via the injectedJavaScript property. So we use this to load external
// files: First here we convert the JS file to a plain string, and that string
// is then loaded by eg. the Mermaid plugin, and finally injected in the WebView.

import { mkdirp, readFile, writeFile } from 'fs-extra';
import { dirname, extname, basename } from 'path';
const execa = require('execa');

const rootDir = dirname(dirname(dirname(__dirname)));
const mobileDir = `${rootDir}/packages/app-mobile`;
const outputDir = `${mobileDir}/lib/rnInjectedJs`;

/**
 * Stores the contents of the file at [filePath] as an importable string.
 *
 * @param name the name (excluding the .js extension) of the output file that will contain
 *             the JSON-ified file content
 * @param filePath Path to the file to JSON-ify.
 */
async function copyJs(name: string, filePath: string) {
	const outputPath = `${outputDir}/${name}.js`;
	console.info(`Creating: ${outputPath}`);
	const js = await readFile(filePath, 'utf-8');
	const json = `module.exports = ${JSON.stringify(js)};`;
	await writeFile(outputPath, json);
}


class BundledFile {
	private readonly bundleOutputPath: string;
	private readonly bundleMinifiedPath: string;
	private readonly bundleBaseName: string;

	public constructor(
		private readonly bundleName: string,
		private readonly sourceFilePath: string
	) {
		const rootFileDirectory = dirname(sourceFilePath);
		this.bundleBaseName = basename(sourceFilePath, extname(sourceFilePath));
		this.bundleOutputPath = `${rootFileDirectory}/${this.bundleBaseName}.bundle.js`;
		this.bundleMinifiedPath = `${rootFileDirectory}/${this.bundleBaseName}.bundle.min.js`;
	}

	/**
	 * Create a minified JS file in the same directory as `this.sourceFilePath` with
	 * the same name.
	 */
	public async build() {
		console.info(`Building bundle: ${this.bundleName}...`);

		await execa('yarn', [
			'run', 'rollup',
			this.sourceFilePath,
			'--name', this.bundleName,
			'--config', `${mobileDir}/injectedJS.config.js`,
			'-f', 'iife',
			'-o', this.bundleOutputPath,
		]);

		console.info(`Minifying bundle: ${this.bundleName}...`);
		await execa('yarn', [
			'run', 'uglifyjs',
			'--compress',
			'-o', this.bundleMinifiedPath,
			this.bundleOutputPath,
		]);
	}

	/**
	 * Creates a file that can be imported by React native. This file contains the
	 * bundled JS as a string.
	 */
	public async copyToImportableFile() {
		await copyJs(`${this.bundleBaseName}.bundle`, this.bundleMinifiedPath);
	}
}

async function main() {
	await mkdirp(outputDir);

	const bundledFiles: BundledFile[] = [
		new BundledFile(
			'codeMirrorBundle',
			`${mobileDir}/components/NoteEditor/CodeMirror/CodeMirror.ts`
		),
	];

	// Build all in parallel
	await Promise.all(bundledFiles.map(async file => {
		await file.build();
		await file.copyToImportableFile();
	}));

	await copyJs('webviewLib', `${mobileDir}/../lib/renderers/webviewLib.js`);
}

module.exports = main;
