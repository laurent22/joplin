import { ListRendererItemValueTemplates, NoteListColumns } from '../plugins/api/noteListType';

export default (template: string, itemValueTemplates: ListRendererItemValueTemplates, columns: NoteListColumns) => {
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
		if (column.name === 'note.titleHtml') classes.push('-main');

		output.push(`<div class="${classes.join(' ')}" style="${style.join('; ')}">${template.replace(/{{value}}/g, valueReplacement)}</div>`);
	}

	return output.join('');
};
