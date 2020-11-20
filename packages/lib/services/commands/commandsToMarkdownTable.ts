import markdownUtils, { MarkdownTableHeader, MarkdownTableRow } from '../../markdownUtils';

export default function commandsToMarkdownTable(): string {
	const headers: MarkdownTableHeader[] = [
		{
			name: 'commandName',
			label: 'Name',
		},
		{
			name: 'description',
			label: 'Description',
		},
		{
			name: 'props',
			label: 'Props',
		},
	];

	const rows: MarkdownTableRow[] = [];

	for (const commandName in this.commands_) {

		const row: MarkdownTableRow = {
			commandName: commandName,
			description: this.label(commandName),
		};

		rows.push(row);
	}

	return markdownUtils.createMarkdownTable(headers, rows);
}
