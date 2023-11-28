/* eslint-disable no-console */

import { copy, exists, remove, mkdirp, readdir, mkdtemp, readFile, writeFile } from 'fs-extra';
import { dirname, join, resolve, basename } from 'path';
import { tmpdir } from 'os';
import { chdir, cwd } from 'process';
import { execCommand } from '@joplin/utils';
import { glob } from 'glob';
import readRepositoryJson from './utils/readRepositoryJson';
const readline = require('readline/promises');
const yargs = require('yargs');


type BeforeEachInstallCallback = (buildDir: string, pluginName: string)=> Promise<void>;

let readlineInterface: any = null;
const waitForInput = async () => {
	readlineInterface ??= readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	if (process.stdin.isTTY) {
		const green = '\x1b[92m';
		const reset = '\x1b[0m';
		await readlineInterface.question(`${green}[Press enter to continue]${reset}`);

		console.log('Continuing...');
	} else {
		console.warn('Input is not from a TTY -- not waiting for input.');
	}
};

const patchFilePathFor = (pluginName: string) => {
	return join(__dirname, 'plugin-patches', `${pluginName}.diff`);
};

const buildDefaultPlugins = async (beforeInstall: BeforeEachInstallCallback) => {
	const packagesDir = dirname(__dirname);
	const outputParentDir = resolve(join(packagesDir, 'app-desktop', 'build', 'defaultPlugins'));
	const pluginSourcesDir = resolve(join(__dirname, 'plugin-sources'));
	const pluginRepositoryData = await readRepositoryJson(join(__dirname, 'pluginRepositories.json'));

	const originalDirectory = cwd();

	const logStatus = (...message: string[]) => {
		console.log('\x1b[96m', ...message, '\x1b[0m');
	};

	for (const pluginId in pluginRepositoryData) {
		console.log('plugin', pluginId);

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
			const currentCommitHash = (await execCommand(['git', 'rev-parse', 'HEAD~'])).trim();
			const expectedCommitHash = repositoryData.commit;

			if (currentCommitHash !== expectedCommitHash) {
				logStatus(`Switching to commit ${expectedCommitHash}`);
				await execCommand(['git', 'switch', repositoryData.branch]);
				await execCommand(['git', 'checkout', expectedCommitHash]);
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

			logStatus('Marking manifest as built-in');
			const manifestFile = './src/manifest.json';
			const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
			manifest._built_in = true;
			await writeFile(manifestFile, JSON.stringify(manifest, undefined, '\t'));

			logStatus('Creating initial commit.');
			await execCommand('git add .');
			await execCommand(['git', 'config', 'user.name', 'Build script']);
			await execCommand(['git', 'config', 'user.email', '']);
			await execCommand(['git', 'commit', '-m', 'Initial commit']);

			const patchFile = patchFilePathFor(pluginId);
			if (await exists(patchFile)) {
				logStatus('Applying patch.');
				await execCommand(['git', 'apply', patchFile]);
			}

			await beforeInstall(buildDir, pluginId);

			logStatus('Installing dependencies.');
			await execCommand('npm install');

			logStatus('Copying published file.');
			const jplFiles = await glob('publish/*.jpl');

			if (jplFiles.length === 0) {
				throw new Error(`No published files found in ${buildDir}/publish`);
			}

			const outputDirectory = join(outputParentDir, pluginId);
			if (await exists(outputDirectory)) {
				await remove(outputDirectory);
			}
			await mkdirp(outputDirectory);
			await copy(jplFiles[0], join(outputDirectory, 'plugin.jpl'));
		} catch (error) {
			console.error(error);
			console.log('Build directory', buildDir);
			await waitForInput();
			throw error;
		} finally {
			chdir(originalDirectory);
			await remove(buildDir);
			logStatus('Removed build directory');
		}
	}
};

const build = () => {
	yargs
		.usage('$0 <cmd> [args]')
		.command('build', 'build all', () => { }, async () => {
			await buildDefaultPlugins(async () => { });
			process.exit(0);
		})
		.command('patch <plugin>', 'build all, but stop for patching', (yargs: any) => {
			yargs.positional('plugin', {
				type: 'string',
				describe: 'Name of the plugin to patch',
			});
		}, async (args: any) => {
			await buildDefaultPlugins(async (buildDir, pluginName) => {
				if (pluginName !== args.plugin) {
					return;
				}

				console.log('Make changes to', buildDir, 'to create a patch.');
				await waitForInput();
				await execCommand(['sh', '-c', 'git diff -p > diff.diff']);

				await copy(join(buildDir, './diff.diff'), patchFilePathFor(pluginName));
			});
			process.exit(0);
		})
		.help()
		.argv;
};

build();
