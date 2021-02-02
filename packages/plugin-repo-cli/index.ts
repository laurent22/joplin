#!/usr/bin/env node

import * as fs from 'fs-extra';
import * as path from 'path';
import * as process from 'process';
import validatePluginId from '@joplin/lib/services/plugins/utils/validatePluginId';
import { execCommand2, resolveRelativePathWithinDir, gitPullTry, gitRepoCleanTry, gitRepoClean } from '@joplin/tools/tool-utils.js';
import checkIfPluginCanBeAdded from './lib/checkIfPluginCanBeAdded';
import updateReadme from './lib/updateReadme';
import { NpmPackage } from './lib/types';
import gitCompareUrl from './lib/gitCompareUrl';

function stripOffPackageOrg(name: string): string {
	const n = name.split('/');
	if (n[0][0] === '@') n.splice(0, 1);
	return n.join('/');
}

function isJoplinPluginPackage(pack: any): boolean {
	if (!pack.keywords || !pack.keywords.includes('joplin-plugin')) return false;
	if (stripOffPackageOrg(pack.name).indexOf('joplin-plugin') !== 0) return false;
	return true;
}

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

async function checkPluginRepository(dirPath: string) {
	if (!(await fs.pathExists(dirPath))) throw new Error(`No plugin repository at: ${dirPath}`);
	if (!(await fs.pathExists(`${dirPath}/.git`))) throw new Error(`Directory is not a Git repository: ${dirPath}`);

	const previousDir = chdir(dirPath);
	await gitRepoCleanTry();
	await gitPullTry();
	chdir(previousDir);
}

async function readJsonFile(manifestPath: string, defaultValue: any = null): Promise<any> {
	if (!(await fs.pathExists(manifestPath))) {
		if (defaultValue === null) throw new Error(`No such file: ${manifestPath}`);
		return defaultValue;
	}

	const content = await fs.readFile(manifestPath, 'utf8');
	return JSON.parse(content);
}

async function extractPluginFilesFromPackage(existingManifests: any, workDir: string, packageName: string, destDir: string): Promise<any> {
	const previousDir = chdir(workDir);

	await execCommand2(`npm install ${packageName} --save --ignore-scripts`, { showOutput: false });

	const pluginDir = resolveRelativePathWithinDir(workDir, 'node_modules', packageName, 'publish');

	const files = await fs.readdir(pluginDir);
	const manifestFilePath = path.resolve(pluginDir, files.find((f: any) => path.extname(f) === '.json'));
	const pluginFilePath = path.resolve(pluginDir, files.find((f: any) => path.extname(f) === '.jpl'));

	if (!(await fs.pathExists(manifestFilePath))) throw new Error(`Could not find manifest file at ${manifestFilePath}`);
	if (!(await fs.pathExists(pluginFilePath))) throw new Error(`Could not find plugin file at ${pluginFilePath}`);

	// At this point, we need to check the manifest ID as it's used in various
	// places including as directory name and object key in manifests.json, so
	// it needs to be correct. It's mostly for security reasons. The other
	// manifest properties are checked when the plugin is loaded into the app.
	const manifest = await readJsonFile(manifestFilePath);
	validatePluginId(manifest.id);

	manifest._npm_package_name = packageName;

	checkIfPluginCanBeAdded(existingManifests, manifest);

	const pluginDestDir = resolveRelativePathWithinDir(destDir, manifest.id);
	await fs.mkdirp(pluginDestDir);

	await fs.writeFile(path.resolve(pluginDestDir, 'manifest.json'), JSON.stringify(manifest, null, '\t'), 'utf8');
	await fs.copy(pluginFilePath, path.resolve(pluginDestDir, 'plugin.jpl'));

	chdir(previousDir);

	return manifest;
}

interface CommandBuildArgs {
	pluginRepoDir: string;
}

enum ProcessingActionType {
	Add = 1,
	Update = 2,
}

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

async function readManifests(repoDir: string): Promise<any> {
	return readJsonFile(pluginManifestsPath(repoDir), {});
}

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

async function processNpmPackage(npmPackage: NpmPackage, repoDir: string) {
	const tempDir = `${repoDir}/temp`;
	const obsoleteManifestsPath = path.resolve(repoDir, 'obsoletes.json');

	await fs.mkdirp(tempDir);

	const originalPluginManifests = await readManifests(repoDir);
	const obsoleteManifests = await readJsonFile(obsoleteManifestsPath, {});
	const existingManifests = {
		...originalPluginManifests,
		...obsoleteManifests,
	};

	const packageTempDir = `${tempDir}/packages`;

	await fs.mkdirp(packageTempDir);
	chdir(packageTempDir);
	await execCommand2('npm init --yes --loglevel silent', { quiet: true });

	let actionType: ProcessingActionType = ProcessingActionType.Update;
	let manifests: any = {};
	let manifest: any = {};
	let error: any = null;
	let previousManifest: any = null;

	try {
		const destDir = `${repoDir}/plugins/`;
		manifest = await extractPluginFilesFromPackage(existingManifests, packageTempDir, npmPackage.name, destDir);

		if (!existingManifests[manifest.id]) {
			actionType = ProcessingActionType.Add;
		}

		if (!obsoleteManifests[manifest.id]) {
			previousManifest = { ...manifests[manifest.id] };
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

		await writeManifests(repoDir, manifests);
		await updateReadme(`${repoDir}/README.md`, manifests);
	}

	chdir(repoDir);
	await fs.remove(tempDir);

	if (!(await gitRepoClean())) {
		await execCommand2('git add -A', { showOutput: false });
		await execCommand2(['git', 'commit', '-m', commitMessage(actionType, manifest, previousManifest, npmPackage, error)], { showOutput: false });
	} else {
		console.info('Nothing to commit');
	}
}

async function commandBuild(args: CommandBuildArgs) {
	console.info(new Date(), 'Building repository...');

	const repoDir = args.pluginRepoDir;
	await checkPluginRepository(repoDir);

	// When starting, always update and commit README, in case something has
	// been updated via a pull request (for example obsoletes.json being
	// modified). We do that separately so that the README update doesn't get
	// mixed up with plugin updates, as in this example:
	// https://github.com/joplin/plugins/commit/8a65bbbf64bf267674f854a172466ffd4f07c672
	const manifests = await readManifests(repoDir);
	await updateReadme(`${repoDir}/README.md`, manifests);
	const previousDir = chdir(repoDir);
	if (!(await gitRepoClean())) {
		console.info('Updating README...');
		await execCommand2('git add -A', { showOutput: true });
		await execCommand2('git commit -m "Update README"', { showOutput: true });
	}
	chdir(previousDir);

	const searchResults = (await execCommand2('npm search joplin-plugin --searchlimit 5000 --json', { showOutput: false })).trim();
	const npmPackages = pluginInfoFromSearchResults(JSON.parse(searchResults));

	for (const npmPackage of npmPackages) {
		await processNpmPackage(npmPackage, repoDir);
	}

	await execCommand2('git push');
}

async function commandVersion() {
	const p = await readJsonFile(path.resolve(__dirname, 'package.json'));
	console.info(`Version ${p.version}`);
}

async function main() {
	const scriptName: string = 'plugin-repo-cli';

	const commands: Record<string, Function> = {
		build: commandBuild,
		version: commandVersion,
	};

	let selectedCommand: string = '';
	let selectedCommandArgs: string = '';

	function setSelectedCommand(name: string, args: any) {
		selectedCommand = name;
		selectedCommandArgs = args;
	}

	require('yargs')
		.scriptName(scriptName)
		.usage('$0 <cmd> [args]')

		.command('build <plugin-repo-dir>', 'Build the plugin repository', (yargs: any) => {
			yargs.positional('plugin-repo-dir', {
				type: 'string',
				describe: 'Directory where the plugin repository is located',
			});
		}, (args: any) => setSelectedCommand('build', args))

		.command('version', 'Gives version info', () => {}, (args: any) => setSelectedCommand('version', args))

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
