import { readFile } from 'fs-extra';
import { insertContentIntoFile, rootDir } from './tool-utils';
import markdownUtils, { MarkdownTableHeader, MarkdownTableJustify, MarkdownTableRow } from '@joplin/lib/markdownUtils';

const readmePath = `${rootDir}/README.md`;
const sponsorsPath = `${rootDir}/packages/tools/sponsors.json`;

interface Sponsor {
	name: string;
	id: string;
}

async function main() {
	const sponsors: Sponsor[] = (JSON.parse(await readFile(sponsorsPath, 'utf8'))).github;

	sponsors.sort((a, b) => {
		return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : +1;
	});

	const sponsorsPerRow = 4;

	const headers: MarkdownTableHeader[] = [];

	for (let colIndex = 0; colIndex < sponsorsPerRow; colIndex++) {
		headers.push({
			label: '',
			name: `col${colIndex}`,
			disableEscape: true,
			justify: MarkdownTableJustify.Center,
		});
	}

	const rows: MarkdownTableRow[] = [];

	let sponsorIndex = 0;
	for (let rowIndex = 0; rowIndex < 9999; rowIndex++) {
		let sponsor = null;
		const row: MarkdownTableRow = {};
		for (let colIndex = 0; colIndex < sponsorsPerRow; colIndex++) {
			sponsor = sponsors[sponsorIndex];
			sponsorIndex++;
			if (!sponsor) break;

			row[`col${colIndex}`] = `<img width="50" src="https://avatars2.githubusercontent.com/u/${sponsor.id}?s=96&v=4"/></br>[${sponsor.name}](https://github.com/${sponsor.name})`;
		}

		if (Object.keys(row)) rows.push(row);

		if (!sponsor) break;
	}

	const mdTable = markdownUtils.createMarkdownTable(headers, rows);

	await insertContentIntoFile(
		readmePath,
		'<!-- SPONSORS -->\n',
		'\n<!-- SPONSORS -->',
		mdTable
	);
}

main().catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
