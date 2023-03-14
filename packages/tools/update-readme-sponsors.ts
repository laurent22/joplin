import { readFile } from 'fs-extra';
import { insertContentIntoFile, rootDir } from './tool-utils';
import markdownUtils, { MarkdownTableHeader, MarkdownTableJustify, MarkdownTableRow } from '@joplin/lib/markdownUtils';
import { GithubSponsor, GithubUser, OrgSponsor, Sponsors } from './website/utils/types';
import fetch from 'node-fetch';
const { escapeHtml } = require('@joplin/lib/string-utils');

const readmePath = `${rootDir}/README.md`;
const sponsorsPath = `${rootDir}/packages/tools/sponsors.json`;

const sleep = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms));
};

const fetchWithRetry = async (url: string, opts: any = null) => {
	if (!opts) opts = {};
	let retry = opts && opts.retry || 3;

	while (retry > 0) {
		try {
			return fetch(url, opts);
		} catch (e) {
			if (opts && opts.callback) {
				opts.callback(retry);
			}
			retry = retry - 1;
			if (retry === 0) {
				throw e;
			}

			if (opts && opts.pause) {
				if (opts && !opts.silent) console.log('pausing..');
				await sleep(opts.pause);
				if (opts && !opts.silent) console.log('done pausing...');
			}
		}
	}

	return null;
};

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

			const userResponse = await fetchWithRetry(`https://api.github.com/users/${sponsor.name}`);
			const user = await userResponse.json() as GithubUser;
			row[`col${colIndex}`] = `<img width="50" src="https://avatars2.githubusercontent.com/u/${user.id}?s=96&v=4"/></br>[${sponsor.name}](https://github.com/${sponsor.name})`;
		}

		if (Object.keys(row)) rows.push(row);

		if (!sponsor) break;
	}

	return markdownUtils.createMarkdownTable(headers, rows);
}

async function createOrgSponsorTable(sponsors: OrgSponsor[]): Promise<string> {
	const output: string[] = [];

	for (const sponsor of sponsors) {
		output.push(`<a href="${escapeHtml(sponsor.url)}"><img title="${escapeHtml(sponsor.title)}" width="256" src="https://joplinapp.org/images/sponsors/${escapeHtml(sponsor.imageName)}"/></a>`);
	}

	return output.join(' ');
}

async function main() {
	const sponsors: Sponsors = JSON.parse(await readFile(sponsorsPath, 'utf8'));

	await insertContentIntoFile(
		readmePath,
		'<!-- SPONSORS-GITHUB -->\n',
		'\n<!-- SPONSORS-GITHUB -->',
		await createGitHubSponsorTable(sponsors.github)
	);

	await insertContentIntoFile(
		readmePath,
		'<!-- SPONSORS-ORG -->\n',
		'\n<!-- SPONSORS-ORG -->',
		await createOrgSponsorTable(sponsors.orgs)
	);
}

main().catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
