// React Native WebView cannot load external JS files, however it can load
// arbitrary JS via the injectedJavaScript property. So we use this to load external
// files: First here we convert the JS file to a plain string, and that string
// is then loaded by eg. the Mermaid plugin, and finally injected in the WebView.

import { mkdirp, readFile, writeFile } from 'fs-extra';
import { dirname, extname, basename } from 'path';
const execa = require('execa');

import { OutputOptions, rollup, RollupOptions, watch as rollupWatch } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';

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
	private readonly rootFileDirectory: string;

	public constructor(
		public readonly bundleName: string,
		private readonly sourceFilePath: string
	) {
		this.rootFileDirectory = dirname(sourceFilePath);
		this.bundleBaseName = basename(sourceFilePath, extname(sourceFilePath));
		this.bundleOutputPath = `${this.rootFileDirectory}/${this.bundleBaseName}.bundle.js`;
		this.bundleMinifiedPath = `${this.rootFileDirectory}/${this.bundleBaseName}.bundle.min.js`;
	}

	private getRollupOptions(): [RollupOptions, OutputOptions] {
		const rollupInputOptions: RollupOptions = {
			input: this.sourceFilePath,
			plugins: [
				typescript({
					// Exclude all .js files. Rollup will attempt to import a .js
					// file if both a .ts and .js file are present, conflicting
					// with our build setup. See
					// https://discourse.joplinapp.org/t/importing-a-ts-file-from-a-rollup-bundled-ts-file/
					exclude: `${this.rootFileDirectory}/**/*.js`,
				}),
				nodeResolve(),
			],
		};

		const rollupOutputOptions: OutputOptions = {
			format: 'iife',
			name: this.bundleName,
			file: this.bundleOutputPath,
		};

		return [rollupInputOptions, rollupOutputOptions];
	}

	private async uglify() {
		console.info(`Minifying bundle: ${this.bundleName}...`);
		await execa('yarn', [
			'run', 'uglifyjs',
			'--compress',
			'-o', this.bundleMinifiedPath,
			this.bundleOutputPath,
		]);
	}

	/**
	 * Create a minified JS file in the same directory as `this.sourceFilePath` with
	 * the same name.
	 */
	public async build() {
		const [rollupInputOptions, rollupOutputOptions] = this.getRollupOptions();

		console.info(`Building bundle: ${this.bundleName}...`);
		const bundle = await rollup(rollupInputOptions);
		await bundle.write(rollupOutputOptions);

		await this.uglify();
	}

	public async startWatching() {
		const [rollupInputOptions, rollupOutputOptions] = this.getRollupOptions();
		const watcher = rollupWatch({
			...rollupInputOptions,
			output: [rollupOutputOptions],
			watch: {
				exclude: [
					`${mobileDir}/node_modules/`,
				],
			},
		});

		watcher.on('event', async event => {
			if (event.code === 'BUNDLE_END') {
				await this.uglify();
				await this.copyToImportableFile();
				console.info(`☑ Bundled ${this.bundleName}!`);

				// Let plugins clean up
				await event.result.close();
			} else if (event.code === 'ERROR') {
				console.error(event.error);

				// Clean up any bundle-related resources
				if (event.result) {
					await event.result?.close();
				}
			} else if (event.code === 'END') {
				console.info('Done bundling.');
			} else if (event.code === 'START') {
				console.info('Starting bundler...');
			}
		});

		// We're done configuring the watcher
		watcher.close();
	}

	/**
	 * Creates a file that can be imported by React native. This file contains the
	 * bundled JS as a string.
	 */
	public async copyToImportableFile() {
		await copyJs(`${this.bundleBaseName}.bundle`, this.bundleMinifiedPath);
	}
}


const bundledFiles: BundledFile[] = [
	new BundledFile(
		'codeMirrorBundle',
		`${mobileDir}/components/NoteEditor/CodeMirror/CodeMirror.ts`
	),
];

export async function buildInjectedJS() {
	await mkdirp(outputDir);


	// Build all in parallel
	await Promise.all(bundledFiles.map(async file => {
		await file.build();
		await file.copyToImportableFile();
	}));

	await copyJs('webviewLib', `${mobileDir}/../lib/renderers/webviewLib.js`);
}

export async function watchInjectedJS() {
	// Watch for changes
	for (const file of bundledFiles) {
		void(file.startWatching());
	}
}

