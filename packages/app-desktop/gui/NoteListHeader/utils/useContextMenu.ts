import { useCallback } from 'react';
import bridge from '../../../services/bridge';
import { ColumnName, NoteListColumn, NoteListColumns, columnNames, defaultWidth } from '@joplin/lib/services/plugins/api/noteListType';
import Setting from '@joplin/lib/models/Setting';
import { MenuItemConstructorOptions } from 'electron';
import getColumnTitle from './getColumnTitle';

const Menu = bridge().Menu;

export default (columns: NoteListColumns) => {
	return useCallback(() => {
		const menuItems: MenuItemConstructorOptions[] = [];

		for (const columnName of columnNames) {
			menuItems.push({
				id: columnName,
				label: getColumnTitle(columnName),
				type: 'checkbox',
				checked: !!columns.find(c => c.name === columnName),
				click: (menuItem) => {
					const newColumns = columns.slice();
					const { checked } = menuItem;
					const id = menuItem.id as ColumnName;

					if (!checked) {
						if (columns.length === 1) return;
						const index = newColumns.findIndex(c => c.name === id);
						newColumns.splice(index, 1);
					} else {
						const newColumn: NoteListColumn = {
							name: id,
							width: defaultWidth,
						};

						newColumns.push(newColumn);
					}

					Setting.setValue('notes.columns', newColumns);
				},
			});
		}

		menuItems.sort((a, b) => {
			return a.label < b.label ? -1 : +1;
		});

		const menu = Menu.buildFromTemplate(menuItems);

		menu.popup({ window: bridge().mainWindow() });
	}, [columns]);
};
