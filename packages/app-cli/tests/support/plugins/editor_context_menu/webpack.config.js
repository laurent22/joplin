const path = require('path');
const fs = require('fs-extra');
const CopyPlugin = require('copy-webpack-plugin');
const WebpackOnBuildPlugin = require('on-build-webpack');
const tar = require('tar');
const glob = require('glob');

function readManifest(manifestPath) {
	const content = fs.readFileSync(manifestPath, 'utf8');
	const output = JSON.parse(content);
	if (!output.id) throw new Error(`Manifest plugin ID is not set in ${manifestPath}`);
	return output;
}

function createPluginArchive(sourceDir, destPath) {
	const distFiles = glob.sync(`${sourceDir}/**/*`)
		.map(f => f.substr(sourceDir.length + 1));

	fs.removeSync(destPath);

	tar.create(
		{
			strict: true,
			portable: true,
			file: destPath,
			cwd: sourceDir,
			sync: true,
		},
		distFiles
	);

	console.info(`Plugin archive has been created in ${destPath}`);
}

const distDir = path.resolve(__dirname, 'dist');
const srcDir = path.resolve(__dirname, 'src');
const manifestPath = `${srcDir}/manifest.json`;
const manifest = readManifest(manifestPath);
const archiveFilePath = path.resolve(__dirname, `${manifest.id}.jpl`);

module.exports = {
	mode: 'production',
	entry: './src/index.ts',
	target: 'node',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		alias: {
			api: path.resolve(__dirname, 'api'),
		},
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		filename: 'index.js',
		path: distDir,
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: '**/*',
					context: path.resolve(__dirname, 'src'),
					to: path.resolve(__dirname, 'dist'),
					globOptions: {
						ignore: [
							'**/*.ts',
							'**/*.tsx',
						],
					},
				},
			],
		}),
		new WebpackOnBuildPlugin(function() {
			createPluginArchive(distDir, archiveFilePath);
		}),
	],
};
