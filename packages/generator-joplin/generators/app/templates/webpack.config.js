// -----------------------------------------------------------------------------
// This file is used to build the plugin file (.jpl) and plugin info (.json). It
// is recommended not to edit this file as it would be overwritten when updating
// the plugin framework. If you do make some changes, consider using an external
// JS file and requiring it here to minimize the changes. That way when you
// update, you can easily restore the functionality you've added.
// -----------------------------------------------------------------------------

/* eslint-disable no-console */

const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const chalk = require('chalk');
const CopyPlugin = require('copy-webpack-plugin');
const tar = require('tar');
const glob = require('glob');
const execSync = require('child_process').execSync;
const allPossibleCategories = require('@joplin/lib/pluginCategories.json');

const rootDir = path.resolve(__dirname);
const userConfigFilename = './plugin.config.json';
const userConfigPath = path.resolve(rootDir, userConfigFilename);
const distDir = path.resolve(rootDir, 'dist');
const srcDir = path.resolve(rootDir, 'src');
const publishDir = path.resolve(rootDir, 'publish');

const userConfig = { extraScripts: [], ...(fs.pathExistsSync(userConfigPath) ? require(userConfigFilename) : {}) };

const manifestPath = `${srcDir}/manifest.json`;
const packageJsonPath = `${rootDir}/package.json`;
const allPossibleScreenshotsType = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const manifest = readManifest(manifestPath);
const pluginArchiveFilePath = path.resolve(publishDir, `${manifest.id}.jpl`);
const pluginInfoFilePath = path.resolve(publishDir, `${manifest.id}.json`);

const { builtinModules } = require('node:module');

// Webpack5 doesn't polyfill by default and displays a warning when attempting to require() built-in
// node modules. Set these to false to prevent Webpack from warning about not polyfilling these modules.
// We don't need to polyfill because the plugins run in Electron's Node environment.
const moduleFallback = {};
for (const moduleName of builtinModules) {
	moduleFallback[moduleName] = false;
}

const getPackageJson = () => {
	return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
};

function validatePackageJson() {
	const content = getPackageJson();
	if (!content.name || content.name.indexOf('joplin-plugin-') !== 0) {
		console.warn(chalk.yellow(`WARNING: To publish the plugin, the package name should start with "joplin-plugin-" (found "${content.name}") in ${packageJsonPath}`));
	}

	if (!content.keywords || content.keywords.indexOf('joplin-plugin') < 0) {
		console.warn(chalk.yellow(`WARNING: To publish the plugin, the package keywords should include "joplin-plugin" (found "${JSON.stringify(content.keywords)}") in ${packageJsonPath}`));
	}

	if (content.scripts && content.scripts.postinstall) {
		console.warn(chalk.yellow(`WARNING: package.json contains a "postinstall" script. It is recommended to use a "prepare" script instead so that it is executed before publish. In ${packageJsonPath}`));
	}
}

function fileSha256(filePath) {
	const content = fs.readFileSync(filePath);
	return crypto.createHash('sha256').update(content).digest('hex');
}

function currentGitInfo() {
	try {
		let branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
		const commit = execSync('git rev-parse HEAD', { stdio: 'pipe' }).toString().trim();
		if (branch === 'HEAD') branch = 'master';
		return `${branch}:${commit}`;
	} catch (error) {
		const messages = error.message ? error.message.split('\n') : [''];
		console.info(chalk.cyan('Could not get git commit (not a git repo?):', messages[0].trim()));
		console.info(chalk.cyan('Git information will not be stored in plugin info file'));
		return '';
	}
}

function validateCategories(categories) {
	if (!categories) return null;
	if ((categories.length !== new Set(categories).size)) throw new Error('Repeated categories are not allowed');
	// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
	categories.forEach(category => {
		if (!allPossibleCategories.map(category => { return category.name; }).includes(category)) throw new Error(`${category} is not a valid category. Please make sure that the category name is lowercase. Valid categories are: \n${allPossibleCategories.map(category => { return category.name; })}\n`);
	});
}

function validateScreenshots(screenshots) {
	if (!screenshots) return null;
	for (const screenshot of screenshots) {
		if (!screenshot.src) throw new Error('You must specify a src for each screenshot');

		// Avoid attempting to download and verify URL screenshots.
		if (screenshot.src.startsWith('https://') || screenshot.src.startsWith('http://')) {
			continue;
		}

		const screenshotType = screenshot.src.split('.').pop();
		if (!allPossibleScreenshotsType.includes(screenshotType)) throw new Error(`${screenshotType} is not a valid screenshot type. Valid types are: \n${allPossibleScreenshotsType}\n`);

		const screenshotPath = path.resolve(rootDir, screenshot.src);

		// Max file size is 1MB
		const fileMaxSize = 1024;
		const fileSize = fs.statSync(screenshotPath).size / 1024;
		if (fileSize > fileMaxSize) throw new Error(`Max screenshot file size is ${fileMaxSize}KB. ${screenshotPath} is ${fileSize}KB`);
	}
}

function readManifest(manifestPath) {
	const content = fs.readFileSync(manifestPath, 'utf8');
	const output = JSON.parse(content);
	if (!output.id) throw new Error(`Manifest plugin ID is not set in ${manifestPath}`);
	validateCategories(output.categories);
	validateScreenshots(output.screenshots);
	return output;
}

function createPluginArchive(sourceDir, destPath) {
	const distFiles = glob.sync(`${sourceDir}/**/*`, { nodir: true, windowsPathsNoEscape: true })
		.map(f => f.substr(sourceDir.length + 1));

	if (!distFiles.length) throw new Error('Plugin archive was not created because the "dist" directory is empty');
	fs.removeSync(destPath);

	tar.create(
		{
			strict: true,
			portable: true,
			file: destPath,
			cwd: sourceDir,
			sync: true,
		},
		distFiles,
	);

	console.info(chalk.cyan(`Plugin archive has been created in ${destPath}`));
}

const writeManifest = (manifestPath, content) => {
	fs.writeFileSync(manifestPath, JSON.stringify(content, null, '\t'), 'utf8');
};

function createPluginInfo(manifestPath, destPath, jplFilePath) {
	const contentText = fs.readFileSync(manifestPath, 'utf8');
	const content = JSON.parse(contentText);
	content._publish_hash = `sha256:${fileSha256(jplFilePath)}`;
	content._publish_commit = currentGitInfo();
	writeManifest(destPath, content);
}

function onBuildCompleted() {
	try {
		fs.removeSync(path.resolve(publishDir, 'index.js'));
		createPluginArchive(distDir, pluginArchiveFilePath);
		createPluginInfo(manifestPath, pluginInfoFilePath, pluginArchiveFilePath);
		validatePackageJson();
	} catch (error) {
		console.error(chalk.red(error.message));
	}
}

const baseConfig = {
	mode: 'production',
	target: 'node',
	stats: 'errors-only',
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

const pluginConfig = { ...baseConfig, entry: './src/index.ts',
	resolve: {
		alias: {
			api: path.resolve(__dirname, 'api'),
		},
		fallback: moduleFallback,
		// JSON files can also be required from scripts so we include this.
		// https://github.com/joplin/plugin-bibtex/pull/2
		extensions: ['.js', '.tsx', '.ts', '.json'],
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
							// All TypeScript files are compiled to JS and
							// already copied into /dist so we don't copy them.
							'**/*.ts',
							'**/*.tsx',
						],
					},
				},
			],
		}),
	] };


// These libraries can be included with require(...) or
// joplin.require(...) from content scripts.
const externalContentScriptLibraries = [
	'@codemirror/view',
	'@codemirror/state',
	'@codemirror/language',
	'@codemirror/autocomplete',
	'@codemirror/commands',
	'@codemirror/highlight',
	'@codemirror/lint',
	'@codemirror/lang-html',
	'@lezer/common',
	'@lezer/markdown',
];

const extraScriptExternals = {};
for (const library of externalContentScriptLibraries) {
	extraScriptExternals[library] = { commonjs: library };
}

const extraScriptConfig = {
	...baseConfig,
	resolve: {
		alias: {
			api: path.resolve(__dirname, 'api'),
		},
		fallback: moduleFallback,
		extensions: ['.js', '.tsx', '.ts', '.json'],
	},

	// We support requiring @codemirror/... libraries through require('@codemirror/...')
	externalsType: 'commonjs',
	externals: extraScriptExternals,
};

const createArchiveConfig = {
	stats: 'errors-only',
	entry: './dist/index.js',
	resolve: {
		fallback: moduleFallback,
	},
	output: {
		filename: 'index.js',
		path: publishDir,
	},
	plugins: [{
		apply(compiler) {
			compiler.hooks.done.tap('archiveOnBuildListener', onBuildCompleted);
		},
	}],
};

function resolveExtraScriptPath(name) {
	const relativePath = `./src/${name}`;

	const fullPath = path.resolve(`${rootDir}/${relativePath}`);
	if (!fs.pathExistsSync(fullPath)) throw new Error(`Could not find extra script: "${name}" at "${fullPath}"`);

	const s = name.split('.');
	s.pop();
	const nameNoExt = s.join('.');

	return {
		entry: relativePath,
		output: {
			filename: `${nameNoExt}.js`,
			path: distDir,
			library: 'default',
			libraryTarget: 'commonjs',
			libraryExport: 'default',
		},
	};
}

function buildExtraScriptConfigs(userConfig) {
	if (!userConfig.extraScripts.length) return [];

	const output = [];

	for (const scriptName of userConfig.extraScripts) {
		const scriptPaths = resolveExtraScriptPath(scriptName);
		output.push({ ...extraScriptConfig, entry: scriptPaths.entry,
			output: scriptPaths.output });
	}

	return output;
}

const increaseVersion = version => {
	try {
		const s = version.split('.');
		const d = Number(s[s.length - 1]) + 1;
		s[s.length - 1] = `${d}`;
		return s.join('.');
	} catch (error) {
		error.message = `Could not parse version number: ${version}: ${error.message}`;
		throw error;
	}
};

const updateVersion = () => {
	const packageJson = getPackageJson();
	packageJson.version = increaseVersion(packageJson.version);
	fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

	const manifest = readManifest(manifestPath);
	manifest.version = increaseVersion(manifest.version);
	writeManifest(manifestPath, manifest);

	if (packageJson.version !== manifest.version) {
		console.warn(chalk.yellow(`Version numbers have been updated but they do not match: package.json (${packageJson.version}), manifest.json (${manifest.version}). Set them to the required values to get them in sync.`));
	}
};

function main(environ) {
	const configName = environ['joplin-plugin-config'];
	if (!configName) throw new Error('A config file must be specified via the --joplin-plugin-config flag');

	// Webpack configurations run in parallel, while we need them to run in
	// sequence, and to do that it seems the only way is to run webpack multiple
	// times, with different config each time.

	const configs = {
		// Builds the main src/index.ts and copy the extra content from /src to
		// /dist including scripts, CSS and any other asset.
		buildMain: [pluginConfig],

		// Builds the extra scripts as defined in plugin.config.json. When doing
		// so, some JavaScript files that were copied in the previous might be
		// overwritten here by the compiled version. This is by design. The
		// result is that JS files that don't need compilation, are simply
		// copied to /dist, while those that do need it are correctly compiled.
		buildExtraScripts: buildExtraScriptConfigs(userConfig),

		// Ths config is for creating the .jpl, which is done via the plugin, so
		// it doesn't actually need an entry and output, however webpack won't
		// run without this. So we give it an entry that we know is going to
		// exist and output in the publish dir. Then the plugin will delete this
		// temporary file before packaging the plugin.
		createArchive: [createArchiveConfig],
	};

	// If we are running the first config step, we clean up and create the build
	// directories.
	if (configName === 'buildMain') {
		fs.removeSync(distDir);
		fs.removeSync(publishDir);
		fs.mkdirpSync(publishDir);
	}

	if (configName === 'updateVersion') {
		updateVersion();
		return [];
	}

	return configs[configName];
}


module.exports = (env) => {
	let exportedConfigs = [];

	try {
		exportedConfigs = main(env);
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}

	if (!exportedConfigs.length) {
		// Nothing to do - for example where there are no external scripts to
		// compile.
		process.exit(0);
	}

	return exportedConfigs;
};
