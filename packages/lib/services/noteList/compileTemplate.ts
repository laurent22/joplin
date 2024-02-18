import { escapeHtml } from '../../string-utils';
import { ListRendererItemValueTemplates, NoteListColumns } from '../plugins/api/noteListType';

export default (itemTemplate: string, itemCellTemplate: string, itemValueTemplates: ListRendererItemValueTemplates, columns: NoteListColumns) => {
	const output: string[] = [];

	for (const column of columns) {
		let valueReplacement = itemValueTemplates[column.name] ? itemValueTemplates[column.name] : '';

		if (!valueReplacement) {
			if (column.name === 'note.titleHtml') {
				valueReplacement = '{{{note.titleHtml}}}';
			} else {
				valueReplacement = `{{${column.name}}}`;
			}
		}

		const style: string[] = [];

		if (column.width) {
			style.push(`width: ${column.width}px`);
		} else {
			style.push('flex: 1');
		}

		const classes = ['item'];

		output.push(`<div data-name="${escapeHtml(column.name)}" class="${classes.join(' ')}" style="${style.join('; ')}">${itemCellTemplate.replace(/{{value}}/g, valueReplacement)}</div>`);
	}

	let outputHtml = output.join('');

	if (itemTemplate) {
		if (!itemTemplate.includes('{{{cells}}}')) throw new Error('`itemTemplate` must contain a {{{cells}}} tag');
		outputHtml = itemTemplate.replace(/{{{cells}}}/, outputHtml);
	}

	return outputHtml;
};
