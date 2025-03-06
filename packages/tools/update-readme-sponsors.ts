import { insertContentIntoFile, rootDir } from './tool-utils';
import markdownUtils, { MarkdownTableHeader, MarkdownTableJustify, MarkdownTableRow } from '@joplin/lib/markdownUtils';
import { GithubSponsor, loadSponsors, OrgSponsor } from './utils/loadSponsors';
const { escapeHtml } = require('@joplin/lib/string-utils');

const readmePath = `${rootDir}/README.md`;

async function createGitHubSponsorTable(sponsors: GithubSponsor[]): Promise<string> {
	sponsors = sponsors.slice();

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
		let sponsor: GithubSponsor = null;
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

	return markdownUtils.createMarkdownTable(headers, rows);
}

async function createOrgSponsorTable(sponsors: OrgSponsor[]): Promise<string> {
	const output: string[] = [];

	for (const sponsor of sponsors) {
		const altHtml = sponsor.alt ? ` alt="${escapeHtml(sponsor.alt)}"` : '';
		output.push(`<a href="${escapeHtml(sponsor.url)}"><img title="${escapeHtml(sponsor.title)}" width="256" src="https://joplinapp.org/images/sponsors/${escapeHtml(sponsor.imageName)}"${altHtml}/></a>`);
	}

	return output.join(' ');
}

async function main() {
	const sponsors = await loadSponsors();

	await insertContentIntoFile(
		readmePath,
		'<!-- SPONSORS-GITHUB -->\n',
		'\n<!-- SPONSORS-GITHUB -->',
		await createGitHubSponsorTable(sponsors.github),
	);

	await insertContentIntoFile(
		readmePath,
		'<!-- SPONSORS-ORG -->\n',
		'\n<!-- SPONSORS-ORG -->',
		await createOrgSponsorTable(sponsors.orgs),
	);
}

main().catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
