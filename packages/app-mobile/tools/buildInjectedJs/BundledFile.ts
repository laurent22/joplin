// React Native WebView cannot load external JS files, however it can load
// arbitrary JS via the injectedJavaScript property. So we use this to load external
// files: First here we convert the JS file to a plain string, and that string
// is then loaded by eg. the Mermaid plugin, and finally injected in the WebView.

import { dirname, extname, basename } from 'path';

// We need this to be transpiled to `const webpack = require('webpack')`.
// As such, do a namespace import. See https://www.typescriptlang.org/tsconfig#esModuleInterop
import * as webpack from 'webpack';
import copyJs from './copyJs';

export default class BundledFile {
	private readonly bundleOutputPath: string;
	private readonly bundleBaseName: string;
	private readonly rootFileDirectory: string;

	public constructor(
		public readonly bundleName: string,
		private readonly sourceFilePath: string,
	) {
		this.rootFileDirectory = dirname(sourceFilePath);
		this.bundleBaseName = basename(sourceFilePath, extname(sourceFilePath));
		this.bundleOutputPath = `${this.rootFileDirectory}/${this.bundleBaseName}.bundle.js`;
	}

	private getWebpackOptions(mode: 'production' | 'development'): webpack.Configuration {
		const config: webpack.Configuration = {
			mode,
			entry: this.sourceFilePath,
			devtool: mode === 'development' ? 'inline-nosources-cheap-module-source-map' : undefined,
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

	// Creates a file that can be imported by React native. This file contains the
	// bundled JS as a string.
	private async copyToImportableFile() {
		await copyJs(`${this.bundleBaseName}.bundle`, this.bundleOutputPath);
	}

	private handleErrors(error: Error | undefined | null, stats: webpack.Stats | undefined): boolean {
		let failed = false;

		if (error) {
			console.error(`Error (${this.bundleName}): ${error.name}`, error.message, error.stack);
			failed = true;
		} else if (stats?.hasErrors() || stats?.hasWarnings()) {
			const data = stats.toJson();

			if (data.warnings && data.warningsCount) {
				console.warn(`Warnings (${this.bundleName}): `, data.warningsCount);
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
				console.error(`Errors (${this.bundleName}): `, data.errorsCount);
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

			compiler.run((buildError, stats) => {
				// Always output stats, even on success
				console.log(`Bundle ${this.bundleName} built: `, stats?.toString());

				let failed = this.handleErrors(buildError, stats);

				// Clean up.
				compiler.close(async (closeError) => {
					if (closeError) {
						console.error('Error cleaning up:', closeError);
						failed = true;
					}

					let copyError;
					if (!failed) {
						try {
							await this.copyToImportableFile();
						} catch (error) {
							console.error('Error copying', error);
							failed = true;
							copyError = error;
						}
					}

					if (!failed) {
						resolve();
					} else {
						reject(closeError ?? buildError ?? copyError);
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
		compiler.watch(watchOptions, async (error, stats) => {
			const failed = this.handleErrors(error, stats);
			if (!failed) {
				await this.copyToImportableFile();
			}
		});
	}
}
