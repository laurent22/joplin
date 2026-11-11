import { execCommand, getRootDir } from '@joplin/utils';
import { satisfies } from 'compare-versions';
import { copy, pathExists, readdir, readFile, remove, writeFile } from 'fs-extra';
import { join } from 'path';
import { chdir } from 'process';
import yargs = require('yargs');
import { hideBin } from 'yargs/helpers';

type Dependencies = Record<string, string>;

export interface PackageJson {
	name: string;
	version: string;
	private?: boolean;
	dependencies?: Dependencies;
	devDependencies?: Dependencies;
	peerDependencies?: Dependencies;
	optionalDependencies?: Dependencies;
}

export interface PackageInfo {
	dir: string;
	manifest: PackageJson;
}

const dependencyTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

export const bumpPatch = (version: string) => {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) throw new Error(`Unsupported version format: ${version}`);
	return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
};

// Same behaviour as `lerna version --no-private`: every public package gets a patch bump, and ranges
// pointing to another public package are moved to its new version, keeping the `^` or `~` prefix.
export const bumpVersions = (manifests: PackageJson[]) => {
	const oldVersions = new Map(manifests.map(manifest => [manifest.name, manifest.version]));

	const updateRange = (name: string, range: string) => {
		const oldVersion = oldVersions.get(name);
		const match = range.match(/^([\^~]?)\d+\.\d+\.\d+$/);
		if (!oldVersion || !match || !satisfies(oldVersion, range)) return range;
		return `${match[1]}${bumpPatch(oldVersion)}`;
	};

	return manifests.map(manifest => {
		const output: PackageJson = { ...manifest, version: bumpPatch(manifest.version) };
		for (const type of dependencyTypes) {
			const dependencies = manifest[type];
			if (!dependencies) continue;
			output[type] = Object.fromEntries(Object.entries(dependencies).map(([name, range]) => [name, updateRange(name, range)]));
		}
		return output;
	});
};

// Dev dependencies are ignored because they don't affect consumers, and including them could create
// cycles.
export const sortByDependencies = (packages: PackageInfo[]) => {
	const remaining = new Map(packages.map(p => [p.manifest.name, p]));
	const output: PackageInfo[] = [];

	const runtimeDependencies = ({ manifest }: PackageInfo) => {
		return Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies, ...manifest.optionalDependencies });
	};

	while (remaining.size) {
		const ready = [...remaining.values()].filter(p => !runtimeDependencies(p).some(name => remaining.has(name)));
		if (!ready.length) throw new Error(`Circular dependency between: ${[...remaining.keys()].join(', ')}`);
		for (const p of ready) {
			output.push(p);
			remaining.delete(p.manifest.name);
		}
	}

	return output;
};

const loadPublicPackages = async (rootDir: string) => {
	const packagesDir = join(rootDir, 'packages');
	const output: PackageInfo[] = [];
	for (const name of await readdir(packagesDir)) {
		const dir = join(packagesDir, name);
		const path = join(dir, 'package.json');
		if (!await pathExists(path)) continue;
		const manifest: PackageJson = JSON.parse(await readFile(path, 'utf8'));
		if (!manifest.private) output.push({ dir, manifest });
	}
	return output;
};

const isPublished = async ({ name, version }: PackageJson) => {
	try {
		return await execCommand(['npm', 'view', `${name}@${version}`, 'version'], { quiet: true }) !== '';
	} catch (error) {
		if (String(error).includes('E404')) return false;
		throw error;
	}
};

const hasLicenseFile = async (dir: string) => {
	return (await readdir(dir)).some(name => /^(license|licence)(\..*)?$/i.test(name));
};

// Like lerna, the root licence is temporarily copied to packages that don't have their own.
const publishPackage = async (dir: string, rootLicensePath: string, dryRun: boolean) => {
	const tempLicensePath = await hasLicenseFile(dir) ? '' : join(dir, 'LICENSE');
	if (tempLicensePath) await copy(rootLicensePath, tempLicensePath);
	const previousDir = process.cwd();
	try {
		chdir(dir);
		// Without --workspaces=false, npm applies the root .gitignore to the package, which excludes
		// required files such as packages/lib/vendor/
		await execCommand(['npm', 'publish', '--workspaces=false', ...(dryRun ? ['--dry-run'] : [])]);
	} finally {
		chdir(previousDir);
		if (tempLicensePath) await remove(tempLicensePath);
	}
};

const versionAll = async () => {
	const packages = await loadPublicPackages(await getRootDir());
	const bumped = bumpVersions(packages.map(p => p.manifest));
	for (const [index, { dir, manifest }] of packages.entries()) {
		await writeFile(join(dir, 'package.json'), `${JSON.stringify(bumped[index], null, 2)}\n`, 'utf8');
		console.info(`${manifest.name}: ${manifest.version} => ${bumped[index].version}`);
	}
};

// Packages are published one at a time, dependencies first, so that a failure leaves the registry in a
// consistent state. Already published versions are skipped, so the command can be re-run after a failure.
const publishAll = async (dryRun: boolean) => {
	const rootDir = await getRootDir();
	for (const { dir, manifest } of sortByDependencies(await loadPublicPackages(rootDir))) {
		const id = `${manifest.name}@${manifest.version}`;
		if (await isPublished(manifest)) {
			console.info(`Skipping ${id}: already published`);
			continue;
		}
		console.info(`Publishing ${id}...`);
		await publishPackage(dir, join(rootDir, 'LICENSE'), dryRun);
	}
};

if (require.main === module) {
	void (async () => {
		try {
			await yargs(hideBin(process.argv))
				.command('version', 'Bumps the patch version of all public packages', {}, () => versionAll())
				.command('publish', 'Publishes all public packages whose version is not on the registry yet', yargs => {
					return yargs.option('dry-run', {
						type: 'boolean',
						default: false,
					});
				}, args => publishAll(args['dry-run']))
				.demandCommand(1)
				.strict()
				.parseAsync();
		} catch (error) {
			console.error('Fatal error');
			console.error(error);
			process.exit(1);
		}
	})();
}
