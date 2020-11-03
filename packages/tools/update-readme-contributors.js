require('app-module-path').addPath(`${__dirname}/../ReactNativeClient`);

'use strict';

const request = require('request');

const readmePath = `${__dirname}/../README.md`;
const { insertContentIntoFile } = require('./tool-utils.js');

async function gitHubContributors(page) {
	return new Promise((resolve, reject) => {
		request.get({
			url: `https://api.github.com/repos/laurent22/joplin/contributors${page ? `?page=${page}` : ''}`,
			json: true,
			headers: { 'User-Agent': 'Joplin Readme Updater' },
		}, (error, response, data) => {
			if (error) {
				reject(error);
			} else if (response.statusCode !== 200) {
				reject(new Error(`Error HTTP ${response.statusCode}`));
			} else {
				resolve(data);
			}
		});
	});
}

function contributorTable(contributors) {
	const rows = [];

	let row = [];
	rows.push(row);
	const rowLength = 5;
	let contributorIndex = 0;
	while (contributorIndex < contributors.length) {
		const c = contributors[contributorIndex];
		contributorIndex++;

		const cell = `<img width="50" src="${c.avatar_url}"/></br>[${c.login}](${c.url})`;

		row.push(cell);

		if (row.length >= rowLength) {
			row = [];
			rows.push(row);
		}
	}

	while (rows[rows.length - 1].length < rowLength) rows[rows.length - 1].push('');

	const header = [];
	const headerLine = [];
	for (let i = 0; i < rowLength; i++) {
		header.push('   ');
		headerLine.push(':---:');
	}

	const lines = [];
	lines.push(`| ${header.join(' | ')} |`);
	lines.push(`| ${headerLine.join(' | ')} |`);

	for (const row of rows) {
		lines.push(`| ${row.join(' | ')} |`);
	}

	return lines.join('\n');
}

async function main() {
	let contributors = [];
	let pageIndex = 0;
	const doneNames = [];
	while (true) {
		const response = await gitHubContributors(pageIndex);
		pageIndex++;
		if (!response.length) break;

		// Remove duplicates
		const temp = [];
		for (const r of response) {
			if (doneNames.indexOf(r.login) >= 0) continue;
			doneNames.push(r.login);
			temp.push(r);
		}

		contributors = contributors.concat(temp);
	}

	const tableHtml = contributorTable(contributors);

	await insertContentIntoFile(
		readmePath,
		'<!-- CONTRIBUTORS-TABLE-AUTO-GENERATED -->\n',
		'\n<!-- CONTRIBUTORS-TABLE-AUTO-GENERATED -->',
		tableHtml
	);
}

main(process.argv).catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
