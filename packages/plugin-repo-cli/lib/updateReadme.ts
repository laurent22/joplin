import * as fs from 'fs-extra';
import markdownUtils, { MarkdownTableHeader, MarkdownTableRow } from '@joplin/lib/markdownUtils';

export default async function(readmePath: string, manifests: any) {
	const rows: MarkdownTableRow[] = [];

	for (const pluginId in manifests) {
		rows.push(manifests[pluginId]);
	}

	const headers: MarkdownTableHeader[] = [
		{
			name: 'homepage_url',
			label: '&nbsp;',
			filter: (value: string) => {
				return `[🏠](${markdownUtils.escapeLinkUrl(value)})`;
			},
		},
		{
			name: 'name',
			label: 'Name',
		},
		{
			name: 'version',
			label: 'Version',
		},
		{
			name: 'description',
			label: 'Description',
		},
		{
			name: 'author',
			label: 'Author',
		},
	];

	rows.sort((a: any, b: any) => {
		return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : +1;
	});

	const mdTable = markdownUtils.createMarkdownTable(headers, rows);

	const tableRegex = /<!-- PLUGIN_LIST -->([^]*)<!-- PLUGIN_LIST -->/;

	const content = await fs.pathExists(readmePath) ? await fs.readFile(readmePath, 'utf8') : '<!-- PLUGIN_LIST -->\n<!-- PLUGIN_LIST -->';
	const newContent = content.replace(tableRegex, `<!-- PLUGIN_LIST -->\n${mdTable}\n<!-- PLUGIN_LIST -->`);

	await fs.writeFile(readmePath, newContent, 'utf8');
}
