
import { readFile } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { writeFile } from 'fs-extra';
import apache2 from './licenseText/apache2';
import agplv3 from './licenseText/agplv3';
import mit from './licenseText/mit';
import buildReport, { EntryLicenseType } from './buildReport';
import yargs = require('yargs');
import { hideBin } from 'yargs/helpers';
import { DependencyType } from './getLicenses';

// Important: Review the output of this tool for correctness

const toCodeBlock = (content: string) => {
	const internalFences = [...content.matchAll(/(^|\n)[`]+/g)];
	const longestFence = internalFences
		.reduce((largest, current) => largest.length > current.length ? largest : current[0], '``');
	return `${longestFence}\`\n${content}\n${longestFence}\``;
};

const buildFullReport = async (packageNames: string[]): Promise<string> => {
	const monorepoRootDir = dirname(dirname(dirname(__dirname)));
	const packagesRootDir = join(monorepoRootDir, 'packages');

	const output: string[] = [];

	output.push('# License information');
	output.push('This file summarizes the licenses of Joplin and the direct and indirect dependencies of packages in the Joplin monorepo. Many of these dependencies are used only at build time.');

	output.push('## Joplin\'s license');

	output.push(toCodeBlock(await readFile(join(monorepoRootDir, 'LICENSE'), 'utf-8')));

	output.push('### AGPLv3 License');
	output.push(toCodeBlock(agplv3));

	output.push('## Joplin Server license');
	output.push('This license applies only to **Joplin Server** -- the files in the `packages/server` directory.');
	output.push(toCodeBlock(await readFile(join(packagesRootDir, 'server', 'LICENSE.md'), 'utf-8')));

	const report = await buildReport(packageNames);

	for (const [mode, entries] of Object.entries(report)) {
		output.push('', `## ${mode} dependencies`, '');
		output.push(`Dependencies in this section are listed as "${mode}" dependencies in one of the \`package.json\` files of a Joplin package, or a dependency of a Joplin package.`);

		for (const entry of entries) {
			let licenseShortText = '';
			if (entry.license.type === EntryLicenseType.Mit) {
				licenseShortText = `${toCodeBlock(entry.license.copyright)}\n\nSee [Appendix B](#appendix-b-the-mit-license) for the full MIT license.`;
			} else if (entry.license.type === EntryLicenseType.Apache2) {
				licenseShortText = `${
					entry.license.appendix ?
						`APPENDIX: This package's copy of the Apache 2 license includes the following appendix:\n${toCodeBlock(entry.license.appendix)}\n\n`
						: ''
				}See [Appendix A](#appendix-a-the-apache-2-license) for the Apache 2 license.`;
			} else {
				licenseShortText = toCodeBlock(entry.license.fullText);
			}

			output.push(...[
				`### ${entry.packageNames.join(', ')}`,
				entry.packageSource ? `From ${entry.packageSource}.` : '',
				`**${entry.licenseId}**:`,
				licenseShortText,
				entry.license.notice ? `**NOTICE**:\n${toCodeBlock(entry.license.notice)}` : '',
			].filter(line => !!line.trim()));
		}

	}

	output.push('## Appendix A: The Apache 2 license');
	output.push(toCodeBlock(apache2));
	output.push('## Appendix B: The MIT license');
	output.push(toCodeBlock(mit('[[copyright]]')));

	return output.join('\n\n');
};

const csvQuote = (column: string) => {
	// See https://en.wikipedia.org/wiki/Comma-separated_values#Specification
	return `"${column.replace(/"/g, '""')}"`;
};

void yargs()
	.scriptName(basename(__filename))
	.strict()
	.demandCommand()
	.usage('$0 <cmd>')
	.command(
		'update-report',
		'Rebuilds the license list file.',
		async () => {
			const baseDir = dirname(dirname(dirname(__dirname)));
			const outputPath = join(baseDir, 'readme', 'licenses.md');
			const result = await buildFullReport([
				'app-mobile',
				'app-cli',
				'app-desktop',
				'server',
			]);
			console.log(`Writing to ${outputPath}...`);
			await writeFile(outputPath, result, 'utf-8');
		},
	)
	.command(
		'report <name>',
		'Generates a CSV report for a given package in the Joplin workspace',
		(yargs) => {
			return yargs.options({
				name: {
					type: 'string',
					describe: 'The name of the package (in the Joplin workspace) for which to generate the report.',
				},
			});
		},
		async (argv) => {
			const report = await buildReport([argv.name]);
			const csv = [['Development dependency?', 'Packages', 'License ID', 'Has notice?'].join(',')];
			for (const [type, entries] of Object.entries(report)) {
				for (const entry of entries) {
					csv.push([
						type === DependencyType.Development,
						csvQuote(entry.packageNames.join(',')),
						entry.licenseId,
						!!entry.license.notice,
					].join(','));
				}
			}
			console.log(csv.join('\n'));
		},
	)
	.help()
	.parse(hideBin(process.argv));
