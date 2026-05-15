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
import searchPlugins, { PackageInfo } from './lib/searchPlugins';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';

type PluginManifests = Record<string, PluginManifest>;

function pluginInfoFromSearchResults(results: PackageInfo[]): NpmPackage[] {
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

async function extractPluginFilesFromPackage(existingManifests: PluginManifests, workDir: string, packageName: string, destDir: string): Promise<PluginManifest> {
	const previousDir = chdir(workDir);

	await execCommand(`npm install ${packageName} --save --ignore-scripts`, { showStderr: false, showStdout: false });

	const pluginDir = resolveRelativePathWithinDir(workDir, 'node_modules', packageName, 'publish');

	if (!(await fs.pathExists(pluginDir))) throw new Error(`Could not find publish directory at ${pluginDir}`);

	const files = await fs.readdir(pluginDir);
	const manifestFilePath = path.resolve(pluginDir, files.find((f: string) => path.extname(f) === '.json'));
	const pluginFilePath = path.resolve(pluginDir, files.find((f: string) => path.extname(f) === '.jpl'));

	if (!(await fs.pathExists(manifestFilePath))) throw new Error(`Could not find manifest file at ${manifestFilePath}`);
	if (!(await fs.pathExists(pluginFilePath))) throw new Error(`Could not find plugin file at ${pluginFilePath}`);

	const manifest = await readJsonFile<PluginManifest>(manifestFilePath);
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

function commitMessage(actionType: ProcessingActionType, manifest: PluginManifest | null, previousManifest: PluginManifest | null, npmPackage: NpmPackage, error: Error | null): string {
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

async function readManifests(repoDir: string): Promise<PluginManifests> {
	return readJsonFile(pluginManifestsPath(repoDir), {});
}

async function writeManifests(repoDir: string, manifests: PluginManifests) {
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
	const existingManifests: PluginManifests = {
		...originalPluginManifests,
		...obsoleteManifests,
	} as PluginManifests;

	const tempDir = `${repoDir}/temp`;
	await fs.mkdirp(tempDir);

	const packageTempDir = `${tempDir}/packages`;

	await fs.mkdirp(packageTempDir);
	chdir(packageTempDir);
	await execCommand('npm init --yes --loglevel silent', { quiet: true });

	let actionType: ProcessingActionType = ProcessingActionType.Update;
	let manifests: PluginManifests = {};
	let manifest: PluginManifest | null = null;
	let error: Error | null = null;
	let previousManifest: PluginManifest | null = null;

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

	const npmPackages = pluginInfoFromSearchResults(await searchPlugins());

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
			const info = await readJsonFile<{ version: string }>(p);
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

	type CommandArgs = CommandBuildArgs;
	const commands: Record<string, (args: CommandArgs)=> Promise<void>> = {
		build: commandBuild,
		version: commandVersion,
		updateRelease: commandUpdateRelease,
	};

	let selectedCommand = '';
	let selectedCommandArgs: CommandArgs = null;

	function setSelectedCommand(name: string, args: CommandArgs) {
		selectedCommand = name;
		selectedCommandArgs = args;
	}

	// eslint-disable-next-line no-unused-expressions -- Old code before rule was applied
	require('yargs')
		.scriptName(scriptName)
		.usage('$0 <cmd> [args]')

		.command('build <plugin-repo-dir> [dry-run]', 'Build the plugin repository', (yargs: { positional: (name: string, opts: object)=> void }) => {
			yargs.positional('plugin-repo-dir', {
				type: 'string',
				describe: 'Directory where the plugin repository is located',
			});
		}, (args: CommandArgs) => setSelectedCommand('build', args))

		.command('version', 'Gives version info', () => {}, (args: CommandArgs) => setSelectedCommand('version', args))

		.command('update-release <plugin-repo-dir>', 'Update GitHub release', () => {}, (args: CommandArgs) => setSelectedCommand('updateRelease', args))

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
