import * as fs from 'fs-extra';
import * as path from 'path';
import * as process from 'process';
const { execCommand, execCommandVerbose, rootDir, resolveRelativePathWithinDir } = require('./tool-utils.js');

interface NpmPackage {
	name: string;
	version: string;
	date: Date;
}

function pluginInfoFromSearchResults(results: any[]): NpmPackage[] {
	const output: NpmPackage[] = [];

	for (const r of results) {
		if (r.name.indexOf('joplin-plugin') !== 0) continue;
		if (!r.keywords || !r.keywords.includes('joplin-plugin')) continue;

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
}

async function readManifest(manifestPath: string) {
	const content = await fs.readFile(manifestPath, 'utf8');
	return JSON.parse(content);
}

function shortPackageName(packageName: string): string {
	return packageName.substr('joplin-plugin-'.length);
}

async function extractPluginFilesFromPackage(workDir: string, packageName: string, destDir: string): Promise<any> {
	const previousDir = process.cwd();
	process.chdir(workDir);

	await execCommandVerbose('npm', ['install', packageName, '--save', '--ignore-scripts']);

	const pluginDir = resolveRelativePathWithinDir(workDir, 'node_modules', packageName, 'publish');

	const files = await fs.readdir(pluginDir);
	const manifestFilePath = path.resolve(pluginDir, files.find(f => path.extname(f) === '.json'));
	const pluginFilePath = path.resolve(pluginDir, files.find(f => path.extname(f) === '.jpl'));

	if (!(await fs.pathExists(manifestFilePath))) throw new Error(`Could not find manifest file at ${manifestFilePath}`);
	if (!(await fs.pathExists(pluginFilePath))) throw new Error(`Could not find plugin file at ${pluginFilePath}`);

	// At this point we don't validate any of the plugin files as it's partly
	// done when publishing, and will be done anyway when the app attempts to
	// load the plugin. We just assume all files are valid here.
	const manifest = await readManifest(manifestFilePath);

	// We can't use the manifest plugin ID as directory name since, although
	// it's supposed to be globally unique, there's no guarantee. However the
	// package name is definitely unique.
	const pluginDestDir = resolveRelativePathWithinDir(destDir, shortPackageName(packageName));
	await fs.mkdirp(pluginDestDir);

	await fs.copy(manifestFilePath, path.resolve(pluginDestDir, 'plugin.json'));
	await fs.copy(pluginFilePath, path.resolve(pluginDestDir, 'plugin.jpl'));

	process.chdir(previousDir);

	return manifest;
}

async function main() {
	// We assume that the repository is located in a directory next to the main
	// Joplin monorepo.
	const repoDir = path.resolve(path.dirname(rootDir), 'joplin-plugins');
	const tempDir = `${repoDir}/temp`;

	await checkPluginRepository(repoDir);

	await fs.mkdirp(tempDir);

	const searchResults = (await execCommand('npm search joplin-plugin --searchlimit 1000 --json')).trim();
	const npmPackages = pluginInfoFromSearchResults(JSON.parse(searchResults));

	const packageTempDir = `${tempDir}/packages`;

	await fs.mkdirp(packageTempDir);
	process.chdir(packageTempDir);
	await execCommand('npm init --yes --loglevel silent');

	const manifests: any = {};

	for (const npmPackage of npmPackages) {
		const destDir = `${repoDir}/plugins/`;
		const manifest = await extractPluginFilesFromPackage(packageTempDir, npmPackage.name, destDir);
		manifests[shortPackageName(npmPackage.name)] = manifest;
	}

	await fs.writeFile(path.resolve(repoDir, 'manifests.json'), JSON.stringify(manifests, null, '\t'), 'utf8');

	await fs.remove(tempDir);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
