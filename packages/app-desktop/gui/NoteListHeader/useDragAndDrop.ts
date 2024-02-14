import * as React from 'react';
import { useCallback, useState } from 'react';
import { registerGlobalDragEndEvent, unregisterGlobalDragEndEvent } from '../utils/dragAndDrop';
import { NoteListColumn, NoteListColumns } from '@joplin/lib/services/plugins/api/noteListType';
import Setting from '@joplin/lib/models/Setting';

interface DraggedHeader {
	name: string;
}

interface InsertAt {
	columnName: NoteListColumn['name'];
	location: 'before' | 'after';
}

const dataType = 'text/x-jop-header';

const getHeader = (event: React.DragEvent) => {
	const dt = event.dataTransfer;
	const headerText = dt.getData(dataType);
	if (!headerText) return null;
	return JSON.parse(headerText) as DraggedHeader;
};

const isDraggedHeader = (event: React.DragEvent) => {
	return event.dataTransfer.types.includes(dataType);
};

const getInsertAt = (event: React.DragEvent) => {
	const name = event.currentTarget.getAttribute('data-name') as NoteListColumn['name'];
	const rect = event.currentTarget.getBoundingClientRect();
	const x = event.clientX - rect.x;
	const percent = x / rect.width;

	const data: InsertAt = {
		columnName: name,
		location: percent < 0.5 ? 'before' : 'after',
	};

	return data;
};

export const dropHeaderAt = (columns: NoteListColumns, header: DraggedHeader, insertAt: InsertAt) => {
	const droppedColumn = columns.find(c => c.name === header.name);
	const newColumns: NoteListColumns = [];

	for (const column of columns) {
		if (insertAt.columnName === column.name) {
			if (insertAt.location === 'before') {
				newColumns.push(droppedColumn);
				newColumns.push(column);
			} else {
				newColumns.push(column);
				newColumns.push(droppedColumn);
			}
		} else if (droppedColumn.name === column.name) {
			continue;
		} else {
			newColumns.push(column);
		}
	}

	return newColumns;
};

export default (columns: NoteListColumns) => {
	const [dropAt, setDropAt] = useState<InsertAt|null>(null);

	const onItemDragStart: React.DragEventHandler = useCallback((event) => {
		const name = event.currentTarget.getAttribute('data-name') as NoteListColumn['name'];
		const draggedHeader: DraggedHeader = { name };
		event.dataTransfer.setDragImage(new Image(), 1, 1);
		event.dataTransfer.clearData();
		event.dataTransfer.setData(dataType, JSON.stringify(draggedHeader));
		event.dataTransfer.effectAllowed = 'move';
	}, []);

	const onItemDragOver: React.DragEventHandler = useCallback((event) => {
		if (!isDraggedHeader(event)) return;

		const data = getInsertAt(event);

		setDropAt(current => {
			if (current && current.columnName === data.columnName && current.location === data.location) return current;
			return data;
		});

		registerGlobalDragEndEvent(() => setDropAt(null));
	}, []);

	const onItemDrop: React.DragEventHandler = useCallback(event => {
		const header = getHeader(event);
		if (!header) return;

		unregisterGlobalDragEndEvent();

		const data = getInsertAt(event);

		setDropAt(null);

		if (header.name === data.columnName) return;

		const newColumns = dropHeaderAt(columns, header, data);

		if (JSON.stringify(newColumns) !== JSON.stringify(columns)) {
			Setting.setValue('notes.columns', newColumns);
		}
	}, [columns]);

	return { onItemDragStart, onItemDragOver, onItemDrop, dropAt };
};
