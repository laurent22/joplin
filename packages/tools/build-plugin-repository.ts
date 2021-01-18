import * as fs from 'fs-extra';
import * as path from 'path';
import * as process from 'process';
import validatePluginId from '@joplin/lib/services/plugins/utils/validatePluginId';
import markdownUtils, { MarkdownTableHeader, MarkdownTableRow } from '@joplin/lib/markdownUtils';
const { execCommand, execCommandVerbose, rootDir, resolveRelativePathWithinDir, gitPullTry } = require('./tool-utils.js');

interface NpmPackage {
	name: string;
	version: string;
	date: Date;
}

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

	const previousDir = process.cwd();
	process.chdir(dirPath);
	await gitPullTry();
	process.chdir(previousDir);
}

async function readJsonFile(manifestPath: string, defaultValue: any = null): Promise<any> {
	if (!(await fs.pathExists(manifestPath))) {
		if (defaultValue === null) throw new Error(`No such file: ${manifestPath}`);
		return defaultValue;
	}

	const content = await fs.readFile(manifestPath, 'utf8');
	return JSON.parse(content);
}

function caseInsensitiveFindManifest(manifests: any, manifestId: string): any {
	for (const id of Object.keys(manifests)) {
		if (id.toLowerCase() === manifestId.toLowerCase()) return manifests[id];
	}
	return null;
}

async function extractPluginFilesFromPackage(existingManifests: any, workDir: string, packageName: string, destDir: string): Promise<any> {
	const previousDir = process.cwd();
	process.chdir(workDir);

	await execCommandVerbose('npm', ['install', packageName, '--save', '--ignore-scripts']);

	const pluginDir = resolveRelativePathWithinDir(workDir, 'node_modules', packageName, 'publish');

	const files = await fs.readdir(pluginDir);
	const manifestFilePath = path.resolve(pluginDir, files.find(f => path.extname(f) === '.json'));
	const pluginFilePath = path.resolve(pluginDir, files.find(f => path.extname(f) === '.jpl'));

	if (!(await fs.pathExists(manifestFilePath))) throw new Error(`Could not find manifest file at ${manifestFilePath}`);
	if (!(await fs.pathExists(pluginFilePath))) throw new Error(`Could not find plugin file at ${pluginFilePath}`);

	// At this point, we need to check the manifest ID as it's used in various
	// places including as directory name and object key in manifests.json, so
	// it needs to be correct. It's mostly for security reasons. The other
	// manifest properties are checked when the plugin is loaded into the app.
	const manifest = await readJsonFile(manifestFilePath);
	validatePluginId(manifest.id);

	manifest._npm_package_name = packageName;

	// If there's already a plugin with this ID published under a different
	// package name, we skip it. Otherwise it would allow anyone to overwrite
	// someone else plugin just by using the same ID. So the first plugin with
	// this ID that was originally added is kept.
	//
	// We need case insensitive match because the filesystem might be case
	// insensitive too.
	const originalManifest = caseInsensitiveFindManifest(existingManifests, manifest.id);

	if (originalManifest && originalManifest._npm_package_name !== packageName) {
		throw new Error(`Plugin "${manifest.id}" from npm package "${packageName}" has already been published under npm package "${originalManifest._npm_package_name}". Plugin from package "${packageName}" will not be imported.`);
	}

	const pluginDestDir = resolveRelativePathWithinDir(destDir, manifest.id);
	await fs.mkdirp(pluginDestDir);

	await fs.writeFile(path.resolve(pluginDestDir, 'manifest.json'), JSON.stringify(manifest, null, '\t'), 'utf8');
	await fs.copy(pluginFilePath, path.resolve(pluginDestDir, 'plugin.jpl'));

	process.chdir(previousDir);

	return manifest;
}

async function updateReadme(readmePath: string, manifests: any) {
	const rows: MarkdownTableRow[] = [];

	for (const pluginId in manifests) {
		rows.push(manifests[pluginId]);
	}

	const headers: MarkdownTableHeader[] = [
		{
			name: 'homepage_url',
			label: '&nbsp;',
			filter: (value: string) => {
				return `[🏠](${markdownUtils.escapeLinkUrl(value)})`;
			},
		},
		{
			name: 'name',
			label: 'Name',
		},
		{
			name: 'version',
			label: 'Version',
		},
		{
			name: 'description',
			label: 'Description',
		},
		{
			name: 'author',
			label: 'Author',
		},
	];

	rows.sort((a: any, b: any) => {
		return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : +1;
	});

	const mdTable = markdownUtils.createMarkdownTable(headers, rows);

	const tableRegex = /<!-- PLUGIN_LIST -->([^]*)<!-- PLUGIN_LIST -->/;

	const content = await fs.readFile(readmePath, 'utf8');
	const newContent = content.replace(tableRegex, `<!-- PLUGIN_LIST -->\n${mdTable}\n<!-- PLUGIN_LIST -->`);

	await fs.writeFile(readmePath, newContent, 'utf8');
}

async function main() {
	// We assume that the repository is located in a directory next to the main
	// Joplin monorepo.
	const repoDir = path.resolve(path.dirname(rootDir), 'joplin-plugins');
	const tempDir = `${repoDir}/temp`;
	const pluginManifestsPath = path.resolve(repoDir, 'manifests.json');
	const obsoleteManifestsPath = path.resolve(repoDir, 'obsoletes.json');
	const errorsPath = path.resolve(repoDir, 'errors.json');

	await checkPluginRepository(repoDir);

	await fs.mkdirp(tempDir);

	const originalPluginManifests = await readJsonFile(pluginManifestsPath, {});
	const obsoleteManifests = await readJsonFile(obsoleteManifestsPath, {});
	const existingManifests = {
		...originalPluginManifests,
		...obsoleteManifests,
	};

	const searchResults = (await execCommand('npm search joplin-plugin --searchlimit 5000 --json')).trim();
	const npmPackages = pluginInfoFromSearchResults(JSON.parse(searchResults));

	const packageTempDir = `${tempDir}/packages`;

	await fs.mkdirp(packageTempDir);
	process.chdir(packageTempDir);
	await execCommand('npm init --yes --loglevel silent');

	const errors: any[] = [];

	let manifests: any = {};

	for (const npmPackage of npmPackages) {
		try {
			const packageName = npmPackage.name;
			const destDir = `${repoDir}/plugins/`;
			const manifest = await extractPluginFilesFromPackage(existingManifests, packageTempDir, packageName, destDir);
			if (!obsoleteManifests[manifest.id]) manifests[manifest.id] = manifest;
		} catch (error) {
			console.error(error);
			errors.push(error);
		}
	}

	// We preserve the original manifests so that if a plugin has been removed
	// from npm, we still keep it. It's also a security feature - it means that
	// if a plugin is removed from npm, it's not possible to highjack it by
	// creating a new npm package with the same plugin ID.
	manifests = {
		...originalPluginManifests,
		...manifests,
	};

	await fs.writeFile(pluginManifestsPath, JSON.stringify(manifests, null, '\t'), 'utf8');

	if (errors.length) {
		const toWrite = errors.map((e: any) => {
			return {
				message: e.message || '',
			};
		});
		await fs.writeFile(errorsPath, JSON.stringify(toWrite, null, '\t'), 'utf8');
	} else {
		await fs.remove(errorsPath);
	}

	await updateReadme(`${repoDir}/README.md`, manifests);

	await fs.remove(tempDir);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
