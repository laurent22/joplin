/* eslint-disable require-atomic-updates */

require('app-module-path').addPath(`${__dirname}/../ReactNativeClient`);

const fetch = require('node-fetch');
const fs = require('fs-extra');
const { dirname } = require('lib/path-utils.js');
const markdownUtils = require('lib/markdownUtils');

const rootDir = dirname(__dirname);

function endsWith(str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function downloadCounts(release) {
	const output = {
		mac_count: 0,
		windows_count: 0,
		linux_count: 0,
	};

	for (let i = 0; i < release.assets.length; i++) {
		const asset = release.assets[i];
		const n = asset.name;
		if (endsWith(n, '-mac.zip') || endsWith(n, '.dmg')) {
			output.mac_count += asset.download_count;
		} else if (endsWith(n, '.AppImage') || endsWith(n, '.snap')) {
			output.linux_count += asset.download_count;
		} else if (endsWith(n, '.exe')) {
			output.windows_count += asset.download_count;
		}
	}

	output.total_count = output.mac_count + output.linux_count + output.windows_count;

	return output;
}

function createChangeLog(releases) {
	const output = [];

	output.push('# Joplin changelog');

	for (let i = 0; i < releases.length; i++) {
		const r = releases[i];
		const s = [];
		s.push(`## ${r.tag_name} - ${r.published_at}`);
		s.push('');
		const body = r.body.replace(/#(\d+)/g, '[#$1](https://github.com/laurent22/joplin/issues/$1)');
		s.push(body);
		output.push(s.join('\n'));
	}

	return output.join('\n\n');
}

async function main() {
	const rows = [];

	const totals = {
		windows_count: 0,
		mac_count: 0,
		linux_count: 0,
	};

	const processReleases = (releases) => {
		for (let i = 0; i < releases.length; i++) {
			const release = releases[i];
			if (!release.tag_name.match(/^v\d+\.\d+\.\d+$/)) continue;
			if (release.draft) continue;

			let row = {};
			row = Object.assign(row, downloadCounts(release));
			row.tag_name = `[${release.tag_name}](https://github.com/laurent22/joplin/releases/tag/${release.tag_name})`;
			row.published_at = release.published_at;
			row.body = release.body;

			totals.windows_count += row.windows_count;
			totals.mac_count += row.mac_count;
			totals.linux_count += row.linux_count;

			rows.push(row);
		}
	};

	console.info('Build stats: Downloading releases info...');

	const baseUrl = 'https://api.github.com/repos/laurent22/joplin/releases?page=';
	// const baseUrl = 'http://test.local/releases.json?page='
	let pageNum = 1;
	while (true) {
		console.info(`Build stats: Page ${pageNum}`);
		const response = await fetch(`${baseUrl}${pageNum}`);
		const releases = await response.json();
		if (!releases || !releases.length) break;
		processReleases(releases);
		pageNum++;
	}

	const changelogText = createChangeLog(rows);
	await fs.writeFile(`${rootDir}/readme/changelog.md`, changelogText);

	const grandTotal = totals.windows_count + totals.mac_count + totals.linux_count;
	totals.windows_percent = totals.windows_count / grandTotal;
	totals.mac_percent = totals.mac_count / grandTotal;
	totals.linux_percent = totals.linux_count / grandTotal;

	const formatter = new Intl.NumberFormat('en-US', { style: 'decimal' });

	const totalsMd = [
		{ name: 'Total Windows downloads', value: formatter.format(totals.windows_count) },
		{ name: 'Total macOs downloads', value: formatter.format(totals.mac_count) },
		{ name: 'Total Linux downloads', value: formatter.format(totals.linux_count) },
		{ name: 'Windows %', value: `${Math.round(totals.windows_percent * 100)}%` },
		{ name: 'macOS %', value: `${Math.round(totals.mac_percent * 100)}%` },
		{ name: 'Linux %', value: `${Math.round(totals.linux_percent * 100)}%` },
	];

	for (let i = 0; i < rows.length; i++) {
		rows[i].mac_count = formatter.format(rows[i].mac_count);
		rows[i].windows_count = formatter.format(rows[i].windows_count);
		rows[i].linux_count = formatter.format(rows[i].linux_count);
		rows[i].total_count = formatter.format(rows[i].total_count);
	}

	const statsMd = [];

	statsMd.push('# Joplin statistics');

	statsMd.push(markdownUtils.createMarkdownTable([
		{ name: 'name', label: 'Name' },
		{ name: 'value', label: 'Value' },
	], totalsMd));

	statsMd.push(markdownUtils.createMarkdownTable([
		{ name: 'tag_name', label: 'Version' },
		{ name: 'published_at', label: 'Date' },
		{ name: 'windows_count', label: 'Windows' },
		{ name: 'mac_count', label: 'macOS' },
		{ name: 'linux_count', label: 'Linux' },
		{ name: 'total_count', label: 'Total' },
	], rows));

	const statsText = statsMd.join('\n\n');
	await fs.writeFile(`${rootDir}/readme/stats.md`, statsText);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
