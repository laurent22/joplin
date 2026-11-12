
/* eslint-disable no-console */

import { copy, exists, remove, readdir, mkdtemp, readFile } from 'fs-extra';
import { join, resolve, basename } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import { chdir, cwd } from 'process';
import { execCommand } from '@joplin/utils';
import { glob } from 'glob';
import readRepositoryJson, { BuiltInPluginType, RepositoryData } from './utils/readRepositoryJson';
import getPathToPatchFileFor from './utils/getPathToPatchFileFor';
import getCurrentCommitHash from './utils/getCurrentCommitHash';
import { waitForCliInput } from '@joplin/utils/cli';

interface Options {
	outputParentDir: string|null;
	beforeInstall: (buildDir: string, pluginName: string)=> Promise<void>;
	beforePatch: ()=> Promise<void>;
	useBuildCache: boolean;
}

// Increment to invalidate cached builds, for example after changing how plugins are built
const buildCacheVersion = 1;
const buildCacheDir = process.env.JOPLIN_DEFAULT_PLUGINS_CACHE_DIR || join(__dirname, 'build-cache');

const getBuildCachePath = async (pluginId: string, repositoryData: RepositoryData) => {
	const patchFile = getPathToPatchFileFor(pluginId);
	const patch = await exists(patchFile) ? await readFile(patchFile, 'utf8') : '';
	const hash = createHash('sha256')
		.update(JSON.stringify([buildCacheVersion, pluginId, repositoryData.cloneUrl, repositoryData.commit, patch]))
		.digest('hex');
	return join(buildCacheDir, `${pluginId}-${hash.substring(0, 16)}.jpl`);
};

const buildDefaultPlugins = async (options: Options) => {
	const pluginRepositoryData = await readRepositoryJson(join(__dirname, 'pluginRepositories.json'));

	for (const pluginId in pluginRepositoryData) {
		const repositoryData = pluginRepositoryData[pluginId];
		const outputPath = options.outputParentDir && join(options.outputParentDir, `${pluginId}.jpl`);

		if (repositoryData.type === BuiltInPluginType.Built) {
			const cachePath = options.useBuildCache && outputPath ? await getBuildCachePath(pluginId, repositoryData) : null;
			if (cachePath && await exists(cachePath)) {
				logStatus('Using cached build of', pluginId, 'from', cachePath);
				await copy(cachePath, outputPath);
				continue;
			}

			const sourceHasLocalChanges = await buildPlugin(pluginId, repositoryData, outputPath, options);

			if (cachePath) {
				if (sourceHasLocalChanges) {
					logStatus('Not caching build of', pluginId, ': its source checkout has local changes');
				} else {
					await copy(outputPath, cachePath);
					logStatus('Saved build of', pluginId, 'to', cachePath);
				}
			}
		} else {
			if (!outputPath) {
				console.warn('Skipping NPM plugin,', pluginId, ': missing output path.');
				continue;
			}

			logStatus('Copying plugin', pluginId, 'JPL file to', outputPath);
			await copy(join(__dirname, 'node_modules', repositoryData.package, 'publish', `${pluginId}.jpl`), outputPath);
			logStatus('Copied.');
		}
	}
};

const logStatus = (...message: string[]) => {
	const blue = '\x1b[96m';
	const reset = '\x1b[0m';
	console.log(blue, ...message, reset);
};

const buildPlugin = async (pluginId: string, repositoryData: RepositoryData, outputPath: string|null, options: Options) => {
	const pluginSourcesDir = resolve(join(__dirname, 'plugin-sources'));
	const originalDirectory = cwd();

	const buildDir = await mkdtemp(join(tmpdir(), 'default-plugin-build'));
	try {
		logStatus('Building plugin', pluginId, 'at', buildDir);
		const pluginDir = resolve(join(pluginSourcesDir, pluginId));

		// Clone the repository if not done yet
		if (!(await exists(pluginDir)) || (await readdir(pluginDir)).length === 0) {
			logStatus(`Cloning from repository ${repositoryData.cloneUrl}`);
			await execCommand(['git', 'clone', '--', repositoryData.cloneUrl, pluginDir]);
			chdir(pluginDir);
		}

		chdir(pluginDir);
		const expectedCommitHash = repositoryData.commit;

		logStatus(`Switching to commit ${expectedCommitHash}`);
		await execCommand(['git', 'switch', repositoryData.branch]);

		try {
			await execCommand(['git', 'checkout', expectedCommitHash]);
		} catch (error) {
			logStatus(`git checkout failed with error ${error}. Fetching...`);
			await execCommand(['git', 'fetch']);
			await execCommand(['git', 'checkout', expectedCommitHash]);
		}

		if (await getCurrentCommitHash() !== expectedCommitHash) {
			throw new Error(`Unable to checkout commit ${expectedCommitHash}`);
		}

		// Local changes are included in the build but not in the build cache key
		const sourceHasLocalChanges = (await execCommand(['git', 'status', '--porcelain'], { showStdout: false })).trim() !== '';

		logStatus('Copying repository files...');
		await copy(pluginDir, buildDir, {
			filter: fileName => {
				return basename(fileName) !== '.git';
			},
		});

		chdir(buildDir);

		logStatus('Initializing repository.');
		await execCommand('git init . -b main');

		logStatus('Running before-patch hook.');
		await options.beforePatch();

		const patchFile = getPathToPatchFileFor(pluginId);
		if (await exists(patchFile)) {
			logStatus('Applying patch.');
			await execCommand(['git', 'apply', patchFile]);
		}

		await options.beforeInstall(buildDir, pluginId);

		logStatus('Installing dependencies.');
		// `npm install` occasionally crashes on Windows CI with STATUS_STACK_BUFFER_OVERRUN
		// (exit code 3221226505), hence the retry.
		await execCommand('npm install --no-audit --no-fund --prefer-offline', { retryCount: 3 });

		const jplFiles = await glob('publish/*.jpl');
		logStatus(`Found built .jpl files: ${JSON.stringify(jplFiles)}`);

		if (jplFiles.length === 0) {
			throw new Error(`No published files found in ${buildDir}/publish`);
		}

		if (outputPath !== null) {
			const sourceFile = jplFiles[0];
			logStatus(`Copying built file from ${sourceFile} to ${outputPath}`);
			await copy(sourceFile, outputPath);
		} else {
			console.warn('No output directory specified. Not copying built .jpl files.');
		}

		return sourceHasLocalChanges;
	} catch (error) {
		console.error(error);
		console.log('Build directory', buildDir);
		await waitForCliInput();
		throw error;
	} finally {
		chdir(originalDirectory);
		await remove(buildDir);
		logStatus('Removed build directory');
	}
};

export default buildDefaultPlugins;
