
import getLicenses, { DependencyType, LicenseInfo } from './getLicenses';
import { readFile, readdir } from 'fs/promises';
import { dirname, join } from 'path';
import licenseOverrides from './licenseOverrides';
import { LicenseOverride } from './licenseOverrides/types';
import { exists, writeFile } from 'fs-extra';
import matchApache2 from './utils/matchApache2';
import apache2 from './licenseText/apache2';
import agplv3 from './licenseText/agplv3';
import matchMit from './utils/matchMit';
import mit from './licenseText/mit';

// Important: Review the output of this tool for correctness

interface PackageInfo extends LicenseInfo {
	packageName: string;
}

const cachedFetchResults: Map<string, string|null> = new Map();
const readOrFetchRepositoryFile = async (pkg: PackageInfo, allowedPaths: string[]): Promise<string|null> => {
	for (const path of allowedPaths) {
		const targetPath = join(pkg.path, path);
		if (await exists(targetPath)) {
			const licenseText = await readFile(targetPath, 'utf8');
			return licenseText;
		}
	}

	for (const path of allowedPaths) {
		const cacheKey = `${pkg.repository}/${path}`;
		if (cachedFetchResults.has(cacheKey)) {
			const cacheValue = cachedFetchResults.get(cacheKey);
			if (cacheValue) {
				return cacheValue;
			}
			// Otherwise, try the next allowed path
		} else {
			const repositoryMatch =
				pkg.repository?.match(/^git@github\.com:([^/]+)\/([^.]+)(?:\.git)?$/)
				?? pkg.repository?.match(/^https:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)$/);
			if (repositoryMatch) {
				const organization = repositoryMatch[1];
				const project = repositoryMatch[2];

				console.info('Attempting to fetch', path, 'for repository', pkg.repository, 'from GitHub...');

				const noticeResult = await fetch(`https://raw.githubusercontent.com/${organization}/${project}/HEAD/${path}`);
				if (noticeResult.ok) {
					const result = await noticeResult.text();
					cachedFetchResults.set(cacheKey, result);
					console.error('Fetch success.');
					return result;
				} else {
					cachedFetchResults.set(cacheKey, null);
					console.error(`Fetch failed: ${noticeResult.statusText}`);
				}
			} else {
				console.warn('No repository for package', pkg.packageName);
			}
		}
	}

	return null;
};

const getNotice = async (pkg: PackageInfo) => {
	// Some package overrides lack a `path`
	if (!pkg.path) {
		console.log('Not including notices for', pkg.packageName, ' -- no path.');
		return '';
	}

	const files = await readdir(pkg.path);
	const noticeLines = [];
	for (const fileName of files) {
		if (/NOTICE(?:S)?(?:\.\w+)?$/i.exec(fileName)) {
			const noticeContent = await readFile(join(pkg.path, fileName), 'utf8');
			noticeLines.push(`${fileName}:\n\n${noticeContent}`);
		}
	}

	// If no notices were found, there may still be such a file in the package's repository
	// (as is the case for some Amazon AWS packages).
	if (noticeLines.length === 0 && pkg.licenses.includes('Apache')) {
		noticeLines.push(await readOrFetchRepositoryFile(pkg, ['NOTICE', 'NOTICE.md']));
	}

	return noticeLines.join('\n\n');
};

const readLicense = async (pkg: PackageInfo) => {
	let result = '';
	if (pkg.licenseText && !pkg.licenses.includes('UNKNOWN')) {
		result = pkg.licenseText;
	}

	// By default, license-checker-rseidelsohn uses the README when the license can't be
	// found. This is often wrong, and we can do better:
	if (pkg.path && (!pkg.licenseFile || pkg.licenseFile.match(/\/README(\.\w+)?$/))) {
		result = await readOrFetchRepositoryFile(pkg, ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'MIT-LICENSE.txt']);
	}

	if (!result && pkg.licenseFile) {
		result = await readFile(pkg.licenseFile, 'utf8');
	}

	return result;
};

const toCodeBlock = (content: string) => {
	const internalFences = [...content.matchAll(/(^|\n)[`]+/g)];
	const longestFence = internalFences
		.reduce((largest, current) => largest.length > current.length ? largest : current[0], '``');
	return `${longestFence}\`\n${content}\n${longestFence}\``;
};

const buildForPackage = async (packageNames: string[]): Promise<string> => {
	const monorepoRootDir = dirname(dirname(dirname(__dirname)));
	const packagesRootDir = join(monorepoRootDir, 'packages');

	const output: string[] = [];

	// Identifiers for licenses that can be excluded.
	const excludeLicenses: string[] = [];

	output.push('# License information');
	output.push('This file summarizes the licenses of Joplin and the direct and indirect dependencies of packages in the Joplin monorepo. Many of these dependencies are used only at build time.');

	output.push('## Joplin\'s license');

	output.push(toCodeBlock(await readFile(join(monorepoRootDir, 'LICENSE'), 'utf-8')));

	output.push('### AGPLv3 License');
	output.push(toCodeBlock(agplv3));

	output.push('## Joplin Server license');
	output.push('This license applies only to **Joplin Server** -- the files in the `packages/server` directory.');
	output.push(toCodeBlock(await readFile(join(packagesRootDir, 'server', 'LICENSE.md'), 'utf-8')));

	const packageOverrides: LicenseOverride[] = [];
	for (const packageToCheck of packageNames) {
		if (licenseOverrides[packageToCheck]) {
			packageOverrides.push(...licenseOverrides[packageToCheck]);
		}
	}

	for (const mode of [DependencyType.Production, DependencyType.Development]) {
		output.push('', `## ${mode} dependencies`, '');
		output.push(`Dependencies in this section are listed as "${mode}" dependencies in one of the \`package.json\` files of a Joplin package, or a dependency of a Joplin package.`);

		const dependencyLicenses: Record<string, LicenseInfo> = {};
		for (const packageName of packageNames) {
			const packageDir = join(packagesRootDir, packageName);
			const packageLicenses = await getLicenses(packageDir, mode, excludeLicenses, packageOverrides);
			for (const packageName in packageLicenses) {
				dependencyLicenses[packageName] = packageLicenses[packageName];
			}
		}

		// Group into per-repository (some dependencies are broken up into multiple
		// packages)
		const repositoryToPackages: Record<string, PackageInfo[]> = Object.create(null);

		for (const packageName in dependencyLicenses) {
			const packageData = dependencyLicenses[packageName];
			repositoryToPackages[packageData.repository] ??= [];
			repositoryToPackages[packageData.repository].push({
				packageName,
				...packageData,
			});
		}

		for (const repository in repositoryToPackages) {
			let repositoryOutput: string[] = [];
			let relevantPackages: string[] = [];

			const flushOutput = () => {
				if (relevantPackages.length > 0 || repositoryOutput.length > 0) {
					output.push(`### ${relevantPackages.join(', ')}`);
					output.push(repository && repository !== 'null' ? `From ${repository}.` : '');
					output.push(...repositoryOutput);
				}

				relevantPackages = [];
				repositoryOutput = [];
			};

			// Try to fetch LICENSE and NOTICE from node_modules
			let previousLicense: string|null = null;
			let previousNotice: string|null = null;
			for (const pkg of repositoryToPackages[repository]) {
				const currentNotice = await getNotice(pkg);
				if (previousLicense !== pkg.licenses || previousNotice !== currentNotice) {
					flushOutput();

					repositoryOutput.push(`**${pkg.licenses}**:`);

					const licenseText = await readLicense(pkg) ?? 'NONE AVAILABLE';

					// The Apache2 license is both long and common. Extracting it to an Appendix can significantly
					// decrease the size of the license statement.
					const apache2Match = matchApache2(licenseText);
					if (apache2Match) {
						repositoryOutput.push('See [Appendix A](#appendix-a-the-apache-2-license) for the Apache 2 license.');
						if (
							apache2Match.appendix) {
							repositoryOutput.push(
								'This package\'s copy of the Apache 2 license includes the following appendix:',
								toCodeBlock(apache2Match.appendix),
							);
						}
					} else {
						const mitMatch = matchMit(licenseText);
						if (mitMatch) {
							repositoryOutput.push(`Copyright: ${mitMatch.copyright}`);
							repositoryOutput.push('See [Appendix B](#appendix-b-the-mit-license) for the full MIT license.');
						} else {
							repositoryOutput.push(toCodeBlock(licenseText));
						}
					}

					if (currentNotice) {
						repositoryOutput.push('**NOTICE**:', toCodeBlock(currentNotice));
					}

					previousLicense = pkg.licenses;
					previousNotice = currentNotice;
				}

				relevantPackages.push(pkg.packageName);
			}
			flushOutput();
		}

	}

	output.push('## Appendix A: The Apache 2 license');
	output.push(toCodeBlock(apache2));
	output.push('## Appendix B: The MIT license');
	output.push(toCodeBlock(mit('[[copyright]]')));

	return output.join('\n\n');
};

const licenseStatementBuilder = async () => {
	const baseDir = dirname(dirname(dirname(__dirname)));
	const outputPath = join(baseDir, 'readme', 'licenses.md');
	const result = await buildForPackage([
		'app-mobile',
		'app-cli',
		'app-desktop',
		'server',
	]);
	console.log('Writing...');
	await writeFile(outputPath, result, 'utf-8');
};

licenseStatementBuilder().catch(error => {
	console.error('Error', error);
	process.exit(1);
});
