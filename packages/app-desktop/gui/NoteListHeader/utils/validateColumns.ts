import { NoteListColumns, defaultListColumns } from '@joplin/lib/services/plugins/api/noteListType';

export default (columns: NoteListColumns) => {
	if (!columns || !columns.length) return defaultListColumns();

	// There must be one column with flexible width
	if (!columns.find(c => !c.width)) {
		const newColumns = columns.slice();
		newColumns[newColumns.length - 1] = {
			...newColumns[newColumns.length - 1],
			width: 0,
		};
		return newColumns;
	}

	// There can't be more than one column with flexible width
	if (columns.filter(c => !c.width).length > 1) {
		const newColumns = columns.slice();
		for (let i = 0; i < newColumns.length; i++) {
			const col = newColumns[i];
			newColumns[i] = {
				...col,
				width: i === newColumns.length - 1 ? 0 : 100,
			};
		}
		return newColumns;
	}

	return columns;
};
