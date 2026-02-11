
import getLicenses, { DependencyType, LicenseInfo } from './getLicenses';
import { readFile, readdir } from 'fs/promises';
import { dirname, join } from 'path';
import licenseOverrides from './licenseOverrides';
import { LicenseOverride } from './licenseOverrides/types';
import { exists } from 'fs-extra';
import matchApache2 from './utils/matchApache2';
import matchMit from './utils/matchMit';


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

				console.error('Attempting to fetch', path, 'for repository', pkg.repository, 'from GitHub...');

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
		console.error('Not including notices for', pkg.packageName, ' -- no path.');
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

const trimBeforeLicenseHeader = (text: string) => {
	const header = text.match(/#+ License[\n]/i) ?? text.match(/[\n]License[\n]--+[\n]/i);
	if (header) {
		return text.substring(header.index);
	} else {
		return text;
	}
};

const readLicense = async (pkg: PackageInfo) => {
	let result = '';
	if (pkg.licenseText && !pkg.licenses.includes('UNKNOWN')) {
		result = pkg.licenseText;
	}

	const resolvedLicenseToReadme = pkg.licenseFile && pkg.licenseFile.match(/\/README(\.\w+)?$/);

	// By default, license-checker-rseidelsohn uses the README when the license can't be
	// found. This is often wrong, and we can do better:
	if (pkg.path && (!pkg.licenseFile || resolvedLicenseToReadme)) {
		result = await readOrFetchRepositoryFile(pkg, ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'MIT-LICENSE.txt']);
	}

	if (!result && pkg.licenseFile) {
		result = await readFile(pkg.licenseFile, 'utf8');

		if (resolvedLicenseToReadme) {
			result = trimBeforeLicenseHeader(result);
		}
	}

	return result;
};

export enum EntryLicenseType {
	Mit = 'MIT',
	Apache2 = 'Apache2',
	Other = '',
}

type LicenseDetails = {
	type: EntryLicenseType.Apache2;
	notice: string;
	appendix: string;
} | {
	type: EntryLicenseType.Mit;
	notice: string;
	copyright: string;
} | {
	type: EntryLicenseType.Other;
	notice: string;
	fullText: string;
};

interface ReportEntry {
	packageNames: string[];

	license: LicenseDetails;
	licenseId: string;
	packageSource: string;
}

type Report = Record<DependencyType, ReportEntry[]>;

const buildReport = async (packageNames: string[]): Promise<Report> => {
	const monorepoRootDir = dirname(dirname(dirname(__dirname)));
	const packagesRootDir = join(monorepoRootDir, 'packages');

	const packageOverrides: LicenseOverride[] = [];
	for (const packageToCheck of packageNames) {
		if (licenseOverrides[packageToCheck]) {
			packageOverrides.push(...licenseOverrides[packageToCheck]);
		}
	}

	const report: Report = { [DependencyType.Production]: [], [DependencyType.Development]: [] };
	for (const mode of [DependencyType.Production, DependencyType.Development]) {
		const output: ReportEntry[] = [];
		report[mode] = output;

		const dependencyLicenses: Map<string, LicenseInfo> = new Map();
		for (const packageName of packageNames) {
			const packageDir = join(packagesRootDir, packageName);
			const packageLicenses = await getLicenses(packageDir, mode, [], packageOverrides);
			for (const packageName in packageLicenses) {
				dependencyLicenses.set(packageName, packageLicenses[packageName]);
			}
		}

		// Group into per-repository (some dependencies are broken up into multiple
		// packages)
		const repositoryToPackages: Map<string, PackageInfo[]> = new Map();

		for (const [packageName, packageData] of dependencyLicenses) {
			const packageInfo = {
				packageName,
				...packageData,
			};

			const repositoryData = repositoryToPackages.get(packageData.repository);
			if (repositoryData) {
				repositoryData.push(packageInfo);
			} else {
				repositoryToPackages.set(packageData.repository, [packageInfo]);
			}
		}

		for (const [repository, repositoryData] of repositoryToPackages) {
			let repositoryOutput: string[] = [];
			let relevantPackages: string[] = [];

			let previousLicenseId: string|null = null;
			let lastLicenseData: LicenseDetails|null = null;
			const flushOutput = () => {
				if (relevantPackages.length > 0 || repositoryOutput.length > 0) {
					if (!lastLicenseData) {
						throw new Error('lastLicenseData is not set');
					}

					output.push({
						packageNames: [...relevantPackages],
						license: lastLicenseData,
						licenseId: previousLicenseId,
						packageSource: repository && repository !== 'null' ? repository : null,
					});
				}

				relevantPackages = [];
				repositoryOutput = [];
				lastLicenseData = null;
			};

			// Try to fetch LICENSE and NOTICE from node_modules
			for (const pkg of repositoryData) {
				const currentNotice = await getNotice(pkg);
				let currentLicenses = pkg.licenses;

				const licenseText = await readLicense(pkg) ?? 'NONE AVAILABLE';
				const addOrSetLicense = (matcher: RegExp, identifier: string) => {
					if (!currentLicenses.match(matcher)) {
						// If the license ID was previously unknown, it has now been identified
						if (currentLicenses === 'UNKNOWN') {
							currentLicenses = '';
						}

						currentLicenses = [currentLicenses, identifier].filter(license => license.trim()).join(' AND ');
					}
				};

				// Determine the license data and additional information based on the full license text.
				// This allows extracting copyright and other information from the full license.
				let licenseData: LicenseDetails;
				const apache2Match = matchApache2(licenseText);
				if (apache2Match) {
					licenseData = {
						type: EntryLicenseType.Apache2,
						appendix: apache2Match.appendix || null,
						notice: currentNotice,
					};
					addOrSetLicense(/apache.?2/i, 'Apache-2');
				} else {
					const mitMatch = matchMit(licenseText);
					if (mitMatch) {
						licenseData = {
							type: EntryLicenseType.Mit,
							copyright: mitMatch.copyright,
							notice: currentNotice,
						};
						addOrSetLicense(/mit/i, 'MIT');
					} else {
						licenseData = {
							type: EntryLicenseType.Other,
							fullText: licenseText,
							notice: currentNotice,
						};
					}
				}

				const noticeChanged = lastLicenseData?.notice !== licenseData.notice;
				const copyrightChanged = lastLicenseData?.type === EntryLicenseType.Mit
					&& licenseData.type === EntryLicenseType.Mit
					&& lastLicenseData.copyright !== lastLicenseData.copyright;
				if (previousLicenseId !== currentLicenses || noticeChanged || copyrightChanged) {
					flushOutput();

					previousLicenseId = currentLicenses;
					lastLicenseData = licenseData;
				}

				relevantPackages.push(pkg.packageName);
			}
			flushOutput();
		}
	}

	return report;
};

export default buildReport;
