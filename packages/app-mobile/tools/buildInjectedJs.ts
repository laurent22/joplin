// React Native WebView cannot load external JS files, however it can load
// arbitrary JS via the injectedJavaScript property. So we use this to load external
// files: First here we convert the JS file to a plain string, and that string
// is then loaded by eg. the Mermaid plugin, and finally injected in the WebView.

import { mkdirp, pathExists, readFile, writeFile } from 'fs-extra';
import { dirname, extname, basename } from 'path';
const md5File = require('md5-file');
const execa = require('execa');

// We need this to be transpiled to `const webpack = require('webpack')`.
// As such, do a namespace import. See https://www.typescriptlang.org/tsconfig#esModuleInterop
import * as webpack from 'webpack';

const rootDir = dirname(dirname(dirname(__dirname)));
const mobileDir = `${rootDir}/packages/app-mobile`;
const outputDir = `${mobileDir}/lib/rnInjectedJs`;

// Stores the contents of the file at [filePath] as an importable string.
// [name] should be the name (excluding the .js extension) of the output file that will contain
// the JSON-ified file content.
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

	private getWebpackOptions(mode: 'production' | 'development'): webpack.Configuration {
		const config: webpack.Configuration = {
			mode,
			entry: this.sourceFilePath,
			output: {
				path: this.rootFileDirectory,
				filename: `${this.bundleBaseName}.bundle.js`,

				library: {
					type: 'window',
					name: this.bundleName,
				},
			},
			// See https://webpack.js.org/guides/typescript/
			module: {
				rules: [
					{
						// Include .tsx to include react components
						test: /\.tsx?$/,
						use: 'ts-loader',
						exclude: /node_modules/,
					},
				],
			},
			// Increase the minimum size required
			// to trigger warnings.
			// See https://stackoverflow.com/a/53517149/17055750
			performance: {
				maxAssetSize: 2_000_000, // 2-ish MiB
				maxEntrypointSize: 2_000_000,
			},
			resolve: {
				extensions: ['.tsx', '.ts', '.js'],
			},
			cache: {
				type: 'filesystem',
			},
		};

		return config;
	}

	private async uglify() {
		const md5Path = `${this.bundleOutputPath}.md5`;
		const newMd5 = await md5File(this.bundleOutputPath);
		const previousMd5 = await pathExists(md5Path) ? await readFile(md5Path, 'utf8') : '';

		if (newMd5 === previousMd5 && await pathExists(this.bundleMinifiedPath)) {
			console.info('Bundle has not changed - skipping minifying...');
			return;
		}

		console.info(`Minifying bundle: ${this.bundleName}...`);

		await execa('yarn', [
			'run', 'uglifyjs',
			'--compress',
			'-o', this.bundleMinifiedPath,
			this.bundleOutputPath,
		]);

		await writeFile(md5Path, newMd5, 'utf8');
	}

	private handleErrors(err: Error | undefined | null, stats: webpack.Stats | undefined): boolean {
		let failed = false;

		if (err) {
			console.error(`Error: ${err.name}`, err.message, err.stack);
			failed = true;
		} else if (stats?.hasErrors() || stats?.hasWarnings()) {
			const data = stats.toJson();

			if (data.warnings && data.warningsCount) {
				console.warn('Warnings: ', data.warningsCount);
				for (const warning of data.warnings) {
					// Stack contains the message
					if (warning.stack) {
						console.warn(warning.stack);
					} else {
						console.warn(warning.message);
					}
				}
			}
			if (data.errors && data.errorsCount) {
				console.error('Errors: ', data.errorsCount);
				for (const error of data.errors) {
					if (error.stack) {
						console.error(error.stack);
					} else {
						console.error(error.message);
					}
					console.error();
				}

				failed = true;
			}
		}

		return failed;
	}

	// Create a minified JS file in the same directory as `this.sourceFilePath` with
	// the same name.
	public build() {
		const compiler = webpack(this.getWebpackOptions('production'));
		return new Promise<void>((resolve, reject) => {
			console.info(`Building bundle: ${this.bundleName}...`);

			compiler.run((err, stats) => {
				let failed = this.handleErrors(err, stats);

				// Clean up.
				compiler.close(async (error) => {
					if (error) {
						console.error('Error cleaning up:', error);
						failed = true;
					}
					if (!failed) {
						await this.uglify();
						resolve();
					} else {
						reject();
					}
				});
			});
		});
	}

	public startWatching() {
		const compiler = webpack(this.getWebpackOptions('development'));
		const watchOptions = {
			ignored: '**/node_modules',
		};

		console.info('Watching bundle: ', this.bundleName);
		compiler.watch(watchOptions, async (err, stats) => {
			const failed = this.handleErrors(err, stats);
			if (!failed) {
				await this.uglify();
				await this.copyToImportableFile();
			}
		});
	}

	// Creates a file that can be imported by React native. This file contains the
	// bundled JS as a string.
	public async copyToImportableFile() {
		await copyJs(`${this.bundleBaseName}.bundle`, this.bundleMinifiedPath);
	}
}


const bundledFiles: BundledFile[] = [
	new BundledFile(
		'codeMirrorBundle',
		`${mobileDir}/components/NoteEditor/CodeMirror/CodeMirror.ts`
	),
	new BundledFile(
		'svgEditorBundle',
		`${mobileDir}/components/NoteEditor/ImageEditor/createJsDrawEditor.ts`
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
		file.startWatching();
	}
}


