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
	const distFiles = glob.sync(`${sourceDir}/**/*`, { nodir: true })
		.map(f => f.substr(sourceDir.length + 1));

	if (!distFiles.length) {
		// Usually means there's an error, which is going to be printed by
		// webpack
		console.info('Plugin archive was not created because the "dist" directory is empty');
		return;
	}

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

const rootDir = path.resolve(__dirname);
const distDir = path.resolve(rootDir, 'dist');
const srcDir = path.resolve(rootDir, 'src');
const manifestPath = `${srcDir}/manifest.json`;
const manifest = readManifest(manifestPath);
const archiveFilePath = path.resolve(__dirname, `${manifest.id}.jpl`);

fs.removeSync(distDir);

const baseConfig = {
	mode: 'production',
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
};

const pluginConfig = Object.assign({}, baseConfig, {
	entry: './src/index.ts',
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
});

const lastStepConfig = {
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: '**/*',
					context: path.resolve(__dirname, 'src'),
					to: path.resolve(__dirname, 'dist'),
					globOptions: {
						ignore: [
							// All TypeScript files are compiled to JS and
							// already copied into /dist so we don't copy them.
							'**/*.ts',
							'**/*.tsx',

							// Currently we don't support JS files for the main
							// plugin script. We support it for content scripts,
							// but theyr should be declared in manifest.json,
							// and then they are also compiled and copied to
							// /dist. So wse also don't need to copy JS files.
							'**/*.js',
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

const contentScriptConfig = Object.assign({}, baseConfig, {
	resolve: {
		alias: {
			api: path.resolve(__dirname, 'api'),
		},
		extensions: ['.tsx', '.ts', '.js'],
	},
});

function resolveContentScriptPaths(name) {
	if (['.js', '.ts', '.tsx'].includes(path.extname(name).toLowerCase())) {
		throw new Error(`Content script path must not include file extension: ${name}`);
	}

	const pathsToTry = [
		`./src/${name}.ts`,
		`${'./src/' + '/'}${name}.js`,
	];

	for (const pathToTry of pathsToTry) {
		if (fs.pathExistsSync(`${rootDir}/${pathToTry}`)) {
			return {
				entry: pathToTry,
				output: {
					filename: `${name}.js`,
					path: distDir,
					library: 'default',
					libraryTarget: 'commonjs',
					libraryExport: 'default',
				},
			};
		}
	}

	throw new Error(`Could not find content script "${name}" at locations ${JSON.stringify(pathsToTry)}`);
}

function createContentScriptConfigs() {
	if (!manifest.content_scripts) return [];

	const output = [];

	for (const contentScriptName of manifest.content_scripts) {
		const scriptPaths = resolveContentScriptPaths(contentScriptName);
		output.push(Object.assign({}, contentScriptConfig, {
			entry: scriptPaths.entry,
			output: scriptPaths.output,
		}));
	}

	return output;
}

const exportedConfigs = [pluginConfig].concat(createContentScriptConfigs());

exportedConfigs[exportedConfigs.length - 1] = Object.assign({}, exportedConfigs[exportedConfigs.length - 1], lastStepConfig);

module.exports = exportedConfigs;
