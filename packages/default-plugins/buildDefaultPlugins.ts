
/* eslint-disable no-console */

import { copy, exists, remove, readdir, mkdtemp } from 'fs-extra';
import { join, resolve, basename } from 'path';
import { tmpdir } from 'os';
import { chdir, cwd } from 'process';
import { execCommand } from '@joplin/utils';
import { glob } from 'glob';
import readRepositoryJson from './utils/readRepositoryJson';
import waitForCliInput from './utils/waitForCliInput';
import getPathToPatchFileFor from './utils/getPathToPatchFileFor';
import getCurrentCommitHash from './utils/getCurrentCommitHash';

interface Options {
	beforeInstall: (buildDir: string, pluginName: string)=> Promise<void>;
	beforePatch: ()=> Promise<void>;
}

const buildDefaultPlugins = async (outputParentDir: string|null, options: Options) => {
	const pluginSourcesDir = resolve(join(__dirname, 'plugin-sources'));
	const pluginRepositoryData = await readRepositoryJson(join(__dirname, 'pluginRepositories.json'));

	const originalDirectory = cwd();

	const logStatus = (...message: string[]) => {
		const blue = '\x1b[96m';
		const reset = '\x1b[0m';
		console.log(blue, ...message, reset);
	};

	for (const pluginId in pluginRepositoryData) {
		const repositoryData = pluginRepositoryData[pluginId];

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
