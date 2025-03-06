#!/usr/bin/env node

/* eslint-disable no-console */

require('source-map-support').install();

import * as fs from 'fs-extra';
import * as path from 'path';
import * as process from 'process';
import { resolveRelativePathWithinDir, gitPullTry, gitRepoCleanTry, gitRepoClean } from '@joplin/tools/tool-utils.js';
import updateReadme from './lib/updateReadme';
import { NpmPackage } from './lib/types';
import gitCompareUrl from './lib/gitCompareUrl';
import commandUpdateRelease from './commands/updateRelease';
import { isJoplinPluginPackage, readJsonFile } from './lib/utils';
import { applyManifestOverrides, getObsoleteManifests, getSupersededPackages, readManifestOverrides } from './lib/overrideUtils';
import { execCommand } from '@joplin/utils';
import validateUntrustedManifest from './lib/validateUntrustedManifest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function pluginInfoFromSearchResults(results: any[]): NpmPackage[] {
	const output: NpmPackage[] = [];

	for (const r of results) {
		if (!isJoplinPluginPackage(r)) continue;

		output.push({
			name: r.name,
			version: r.version,
			date: new Date(r.date),
		});
	}

	return output;
}

async function checkPluginRepository(dirPath: string, dryRun: boolean) {
	if (!(await fs.pathExists(dirPath))) throw new Error(`No plugin repository at: ${dirPath}`);
	if (!(await fs.pathExists(`${dirPath}/.git`))) throw new Error(`Directory is not a Git repository: ${dirPath}`);

	const previousDir = chdir(dirPath);
	if (!dryRun) {
		await gitRepoCleanTry();
		await gitPullTry();
	}
	chdir(previousDir);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function extractPluginFilesFromPackage(existingManifests: any, workDir: string, packageName: string, destDir: string): Promise<any> {
	const previousDir = chdir(workDir);

	await execCommand(`npm install ${packageName} --save --ignore-scripts`, { showStderr: false, showStdout: false });

	const pluginDir = resolveRelativePathWithinDir(workDir, 'node_modules', packageName, 'publish');

	if (!(await fs.pathExists(pluginDir))) throw new Error(`Could not find publish directory at ${pluginDir}`);

	const files = await fs.readdir(pluginDir);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const manifestFilePath = path.resolve(pluginDir, files.find((f: any) => path.extname(f) === '.json'));
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const pluginFilePath = path.resolve(pluginDir, files.find((f: any) => path.extname(f) === '.jpl'));

	if (!(await fs.pathExists(manifestFilePath))) throw new Error(`Could not find manifest file at ${manifestFilePath}`);
	if (!(await fs.pathExists(pluginFilePath))) throw new Error(`Could not find plugin file at ${pluginFilePath}`);

	const manifest = await readJsonFile(manifestFilePath);
	manifest._npm_package_name = packageName;

	// We need to validate the manifest to make sure the plugin author isn't
	// trying to override an existing plugin, use an invalid ID, etc..
	validateUntrustedManifest(manifest, existingManifests);

	const pluginDestDir = resolveRelativePathWithinDir(destDir, manifest.id);
	await fs.mkdirp(pluginDestDir);

	await fs.writeFile(path.resolve(pluginDestDir, 'manifest.json'), JSON.stringify(manifest, null, '\t'), 'utf8');
	await fs.copy(pluginFilePath, path.resolve(pluginDestDir, 'plugin.jpl'));

	chdir(previousDir);

	return manifest;
}

interface CommandBuildArgs {
	pluginRepoDir: string;
	dryRun: boolean;
}

enum ProcessingActionType {
	Add = 1,
	Update = 2,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function commitMessage(actionType: ProcessingActionType, manifest: any, previousManifest: any, npmPackage: NpmPackage, error: any): string {
	const output: string[] = [];

	if (!error) {
		if (actionType === ProcessingActionType.Add) {
			output.push('New');
		} else {
			output.push('Update');
		}

		output.push(`${manifest.id}@${manifest.version}`);
	} else {
		output.push(`Error: ${npmPackage.name}@${npmPackage.version}`);
	}

	const compareUrl = gitCompareUrl(manifest, previousManifest);

	return output.join(': ') + (compareUrl ? `\n\n${compareUrl}` : '');
}

function pluginManifestsPath(repoDir: string): string {
	return path.resolve(repoDir, 'manifests.json');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function readManifests(repoDir: string): Promise<any> {
	return readJsonFile(pluginManifestsPath(repoDir), {});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function writeManifests(repoDir: string, manifests: any) {
	await fs.writeFile(pluginManifestsPath(repoDir), JSON.stringify(manifests, null, '\t'), 'utf8');
}

function chdir(path: string): string {
	const previous = process.cwd();
	try {
		process.chdir(path);
	} catch (error) {
		throw new Error(`Could not chdir to path: ${path}`);
	}
	return previous;
}

async function processNpmPackage(npmPackage: NpmPackage, repoDir: string, dryRun: boolean) {
	const originalPluginManifests = await readManifests(repoDir);
	const manifestOverrides = await readManifestOverrides(repoDir);
	const supersededPackages = getSupersededPackages(manifestOverrides);

	if (supersededPackages.includes(npmPackage.name)) {
		console.log('Skipping superseded package', npmPackage.name);
		return;
	}

	const obsoleteManifests = getObsoleteManifests(manifestOverrides);
	const existingManifests = {
		...originalPluginManifests,
		...obsoleteManifests,
	};

	const tempDir = `${repoDir}/temp`;
	await fs.mkdirp(tempDir);

	const packageTempDir = `${tempDir}/packages`;

	await fs.mkdirp(packageTempDir);
	chdir(packageTempDir);
	await execCommand('npm init --yes --loglevel silent', { quiet: true });

	let actionType: ProcessingActionType = ProcessingActionType.Update;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	let manifests: any = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	let manifest: any = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	let error: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	let previousManifest: any = null;

	try {
		const destDir = `${repoDir}/plugins/`;
		manifest = await extractPluginFilesFromPackage(existingManifests, packageTempDir, npmPackage.name, destDir);

		if (!existingManifests[manifest.id]) {
			actionType = ProcessingActionType.Add;
		}

		if (!obsoleteManifests[manifest.id]) {
			previousManifest = { ...originalPluginManifests[manifest.id] };
			manifests[manifest.id] = manifest;
		}
	} catch (e) {
		console.error(e);
		error = e;
	}

	if (!error) {
		// We preserve the original manifests so that if a plugin has been removed
		// from npm, we still keep it. It's also a security feature - it means that
		// if a plugin is removed from npm, it's not possible to highjack it by
		// creating a new npm package with the same plugin ID.
		manifests = {
			...originalPluginManifests,
			...manifests,
		};

		manifests = applyManifestOverrides(manifests, manifestOverrides);

		await writeManifests(repoDir, manifests);
		await updateReadme(`${repoDir}/README.md`, manifests);
	}

	chdir(repoDir);
	await fs.remove(tempDir);

	if (!dryRun) {
		if (!(await gitRepoClean())) {
			await execCommand('git add -A', { showStdout: false });
			await execCommand(['git', 'commit', '-m', commitMessage(actionType, manifest, previousManifest, npmPackage, error)], { showStdout: false });
		} else {
			console.info('Nothing to commit');
		}
	}
}

async function commandBuild(args: CommandBuildArgs) {
	const dryRun = !!args.dryRun;
	console.info(new Date(), 'Building repository...');
	if (dryRun) console.info('Dry run: on');

	const repoDir = args.pluginRepoDir;
	await checkPluginRepository(repoDir, dryRun);

	// When starting, always update and commit README, in case something has
	// been updated via a pull request. We do that separately so that the README
	// update doesn't get mixed up with plugin updates, as in this example:
	// https://github.com/joplin/plugins/commit/8a65bbbf64bf267674f854a172466ffd4f07c672
	const manifests = await readManifests(repoDir);
	await updateReadme(`${repoDir}/README.md`, manifests);
	const previousDir = chdir(repoDir);

	if (!dryRun) {
		if (!(await gitRepoClean())) {
			console.info('Updating README...');
			await execCommand('git add -A');
			await execCommand('git commit -m "Update README"');
		}
	}

	chdir(previousDir);

	const searchResults = (await execCommand('npm search keywords:joplin-plugin --searchlimit 5000 --json', { showStdout: false, showStderr: false })).trim();
	const npmPackages = pluginInfoFromSearchResults(JSON.parse(searchResults));

	for (const npmPackage of npmPackages) {
		await processNpmPackage(npmPackage, repoDir, dryRun);
	}

	if (!dryRun) {
		await commandUpdateRelease(args);

		if (!(await gitRepoClean())) {
			await execCommand('git add -A');
			await execCommand('git commit -m "Update stats"');
		}

		await execCommand('git push');
	}
}

async function commandVersion() {
	const paths = [
		path.resolve(__dirname, 'package.json'),
		path.resolve(__dirname, '..', 'package.json'),
	];

	for (const p of paths) {
		try {
			const info = await readJsonFile(p);
			console.info(`Version ${info.version}`);
			return;
		} catch (error) {
			// Try the next path
		}
	}

	throw new Error(`Cannot find package.json in any of these paths: ${JSON.stringify(paths)}`);
}

async function main() {
	const scriptName = 'plugin-repo-cli';

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	const commands: Record<string, Function> = {
		build: commandBuild,
		version: commandVersion,
		updateRelease: commandUpdateRelease,
	};

	let selectedCommand = '';
	let selectedCommandArgs = '';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	function setSelectedCommand(name: string, args: any) {
		selectedCommand = name;
		selectedCommandArgs = args;
	}

	// eslint-disable-next-line no-unused-expressions -- Old code before rule was applied
	require('yargs')
		.scriptName(scriptName)
		.usage('$0 <cmd> [args]')

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		.command('build <plugin-repo-dir> [dry-run]', 'Build the plugin repository', (yargs: any) => {
			yargs.positional('plugin-repo-dir', {
				type: 'string',
				describe: 'Directory where the plugin repository is located',
			});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		}, (args: any) => setSelectedCommand('build', args))

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		.command('version', 'Gives version info', () => {}, (args: any) => setSelectedCommand('version', args))

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		.command('update-release <plugin-repo-dir>', 'Update GitHub release', () => {}, (args: any) => setSelectedCommand('updateRelease', args))

		.help()
		.argv;

	if (!selectedCommand) {
		console.error(`Please provide a command name or type \`${scriptName} --help\` for help`);
		process.exit(1);
	}

	if (!commands[selectedCommand]) {
		console.error(`No such command: ${selectedCommand}`);
		process.exit(1);
	}

	await commands[selectedCommand](selectedCommandArgs);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
