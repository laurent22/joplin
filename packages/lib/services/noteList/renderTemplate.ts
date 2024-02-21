import { escapeHtml } from '../../string-utils';
import { ColumnName, ListRendererItemValueTemplates, NoteListColumns, RenderNoteView } from '../plugins/api/noteListType';
import * as Mustache from 'mustache';
import { objectValueFromPath } from '@joplin/utils/object';

interface Cell {
	name: ColumnName;
	styleHtml: string;
	value: any;
	contentHtml: ()=> string;
}

export default (columns: NoteListColumns, itemTemplate: string, itemValueTemplates: ListRendererItemValueTemplates, view: RenderNoteView) => {
	if (!columns || !columns.length) return Mustache.render(itemTemplate, view);

	const cells: Cell[] = [];

	for (const column of columns) {
		const styleHtml: string[] = [];

		if (column.width) {
			styleHtml.push(`width: ${column.width}px`);
		} else {
			styleHtml.push('flex: 1');
		}

		cells.push({
			name: column.name,
			styleHtml: styleHtml.join('; '),
			value: objectValueFromPath(view, column.name) || '',
			contentHtml: function() {
				const name = this.name as ColumnName;
				if (itemValueTemplates[name]) {
					return Mustache.render(itemValueTemplates[name], view);
				}
				return ['note.titleHtml', 'note.title'].includes(name) ? this.value : escapeHtml(this.value);
			},
		});
	}

	const finalView = {
		cells,
		...view,
	};

	return Mustache.render(itemTemplate, finalView);
};
