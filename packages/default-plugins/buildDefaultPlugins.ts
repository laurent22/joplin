
/* eslint-disable no-console */

import { copy, exists, remove, readdir, mkdtemp } from 'fs-extra';
import { join, resolve, basename, dirname } from 'path';
import { tmpdir } from 'os';
import { chdir, cwd } from 'process';
import { execCommand } from '@joplin/utils';
import { glob } from 'glob';
import waitForCliInput from './utils/waitForCliInput';
import getPathToPatchFileFor from './utils/getPathToPatchFileFor';
import isGitRepository from './utils/isGitRepository';
import { AppType } from './types';
import pluginRepositoryData from './pluginRepositoryData';
import getCurrentCommitHash from './utils/getCurrentCommitHash';


const monorepoRootDir = dirname(dirname(__dirname));

type BeforeEachInstallCallback = (buildDir: string, pluginName: string)=> Promise<void>;

// Copies everything except .git folders.
const copyExcludingGit = (src: string, dst: string) => {
	return copy(src, dst, {
		filter: fileName => {
			return basename(fileName) !== '.git';
		},
	});
};

const buildDefaultPlugins = async (appType: AppType, outputParentDir: string|null, beforeInstall: BeforeEachInstallCallback) => {
	const pluginSourcesDir = resolve(join(__dirname, 'plugin-sources'));

	const originalDirectory = cwd();

	const logStatus = (...message: string[]) => {
		const blue = '\x1b[96m';
		const reset = '\x1b[0m';
		console.log(blue, ...message, reset);
	};

	for (const pluginId in pluginRepositoryData) {
		const repositoryData = pluginRepositoryData[pluginId];

		if (appType !== AppType.All && !repositoryData.appTypes.includes(appType)) {
			logStatus(`Skipping plugin ${pluginId} -- we're building for ${appType} and not ${repositoryData.appTypes}`);
			continue;
		}

		const buildDir = await mkdtemp(join(tmpdir(), 'default-plugin-build'));
		try {
			logStatus('Building plugin', pluginId, 'at', buildDir);
			const pluginDir = resolve(join(pluginSourcesDir, pluginId));

			if (isGitRepository(repositoryData)) {
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

				logStatus('Copying repository files...');
				await copyExcludingGit(pluginDir, buildDir);
			} else {
				const pathToSource = resolve(monorepoRootDir, repositoryData.path);

				logStatus(`Copying from path ${pathToSource}`);
				await copyExcludingGit(pathToSource, buildDir);
			}

			chdir(buildDir);

			logStatus('Initializing repository.');
			await execCommand('git init . -b main');

			logStatus('Creating initial commit.');
			await execCommand('git add .');
			await execCommand(['git', 'config', 'user.name', 'Build script']);
			await execCommand(['git', 'config', 'user.email', '']);
			await execCommand(['git', 'commit', '-m', 'Initial commit']);

			const patchFile = getPathToPatchFileFor(pluginId);
			if (await exists(patchFile)) {
				logStatus('Applying patch.');
				await execCommand(['git', 'apply', patchFile]);
			}

			await beforeInstall(buildDir, pluginId);

			logStatus('Installing dependencies.');
			await execCommand('npm install');

			const jplFiles = await glob('publish/*.jpl');
			logStatus(`Found built .jpl files: ${JSON.stringify(jplFiles)}`);

			if (jplFiles.length === 0) {
				throw new Error(`No published files found in ${buildDir}/publish`);
			}

			if (outputParentDir !== null) {
				logStatus(`Checking output directory in ${outputParentDir}`);
				const outputPath = join(outputParentDir, `${pluginId}.jpl`);

				const sourceFile = jplFiles[0];
				logStatus(`Copying built file from ${sourceFile} to ${outputPath}`);
				await copy(sourceFile, outputPath);
			} else {
				console.warn('No output directory specified. Not copying built .jpl files.');
			}
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
	}
};

export default buildDefaultPlugins;
