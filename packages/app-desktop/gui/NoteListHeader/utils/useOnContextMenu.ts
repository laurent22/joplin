import { useCallback } from 'react';
import bridge from '../../../services/bridge';
import { NoteListColumn, NoteListColumns, columnNames, defaultWidth } from '@joplin/lib/services/plugins/api/noteListType';
import Setting from '@joplin/lib/models/Setting';

const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;

export default (columns: NoteListColumns) => {
	return useCallback(() => {
		const menu = new Menu();

		for (const columnName of columnNames) {
			menu.append(new MenuItem({
				id: columnName,
				label: columnName,
				type: 'checkbox',
				checked: !!columns.find(c => c.name === columnName),
				click: (menuItem) => {
					const newColumns = columns.slice();
					const { id, checked } = menuItem;

					if (!checked) {
						if (columns.length === 1) return;
						const index = newColumns.findIndex(c => c.name === id);
						newColumns.splice(index, 1);
					} else {
						const newColumn: NoteListColumn = {
							name: id,
							title: id,
							width: defaultWidth,
						};

						newColumns.push(newColumn);
					}

					Setting.setValue('notes.columns', newColumns);
				},
			}));
		}

		menu.popup({ window: bridge().window() });
	}, [columns]);
};
