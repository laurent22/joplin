import { readdir, stat, writeFile } from 'fs-extra';
import { chdir, cwd } from 'process';
import { rootDir } from './tool-utils';
import { execCommand } from '@joplin/utils';
import yargs = require('yargs');
import { rtrimSlashes } from '@joplin/lib/path-utils';

interface LicenseInfo {
	licenses: string;
	repository: string;
	path: string;
}

const getLicenses = async (directory: string): Promise<Record<string, LicenseInfo>> => {
	const previousDir = cwd();
	await chdir(directory);
	const result = await execCommand(['license-checker-rseidelsohn', '--production', '--json'], { quiet: true });
	const info: Record<string, LicenseInfo> = JSON.parse(result);
	if (!info) throw new Error(`Could not parse JSON: ${directory}`);
	await chdir(previousDir);
	return info;
};

const createCsvLine = (items: string[]) => {
	try {
		return `"${items.map(i => i.replace(/"/g, '""')).join('", "')}"`;
	} catch (error) {
		error.message = `Could not process line: ${JSON.stringify(items)}: ${error.message}`;
		throw error;
	}
};

const enforceString = (line: any): string => {
	if (Array.isArray(line)) return line.join(', ');
	return line ? (`${line}`) : '';
};

async function main() {
	const argv = await yargs.argv;
	const pathToCheck = rtrimSlashes(argv._.length ? argv._[0].toString() : '');

	const directories: string[] = [];
	const packageItems = await readdir(`${rootDir}/packages`);
	for (const item of packageItems) {
		const fullPath = `${rootDir}/packages/${item}`;
		if (pathToCheck && !fullPath.endsWith(pathToCheck)) continue;

		const info = await stat(fullPath);
		if (info.isDirectory()) directories.push(fullPath);
	}

	if (!pathToCheck || rootDir.endsWith(pathToCheck)) {
		directories.push(rootDir);
	}

	let licenses: Record<string, LicenseInfo> = {};

	for (const dir of directories) {
		console.info(`Processing ${dir}...`);
		const dirLicenses = await getLicenses(dir);
		for (const [, v] of Object.entries(dirLicenses)) {
			v.path = dir.substr(rootDir.length);
		}
		licenses = { ...licenses, ...dirLicenses };
	}

	const csv: string[][] = [];
	csv.push(['Package', 'Licenses', 'Repository', 'Path']);

	for (const [packageName, info] of Object.entries(licenses)) {
		csv.push([
			enforceString(packageName),
			enforceString(info.licenses),
			enforceString(info.repository),
			enforceString(info.path),
		]);
	}

	const outputFile = `${rootDir}/licenses.csv`;
	await writeFile(outputFile, csv.map(line => createCsvLine(line)).join('\n'));

	console.info(`Created summary in ${outputFile}`);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
