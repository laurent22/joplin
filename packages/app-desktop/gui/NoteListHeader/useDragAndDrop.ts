import * as React from 'react';
import { useCallback, useState } from 'react';
import { Column } from '../NoteList/utils/types';

interface DraggedHeader {
	name: string;
}

interface InsertAt {
	columnName: Column['name'];
	location: 'before' | 'after';
}

export default () => {
	const [dropAt, setDropAt] = useState<InsertAt|null>(null);

	const onItemDragStart: React.DragEventHandler = useCallback((event) => {
		const name = event.currentTarget.getAttribute('data-name') as Column['name'];
		const draggedHeader: DraggedHeader = { name };
		event.dataTransfer.setDragImage(new Image(), 1, 1);
		event.dataTransfer.clearData();
		event.dataTransfer.setData('text/x-jop-header', JSON.stringify(draggedHeader));
	}, []);

	const onItemDragOver: React.DragEventHandler = useCallback((event) => {
		const name = event.currentTarget.getAttribute('data-name') as Column['name'];
		const rect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.x;
		const percent = x / rect.width;

		// const dt = event.dataTransfer;
		// const data = dt.getData('text/x-jop-header');
		// if (!data) return;

		// const draggedHeader:DraggedHeader = JSON.parse(data);
		// if (draggedHeader.name === name) return;

		const data: InsertAt = {
			columnName: name,
			location: percent < 0.5 ? 'before' : 'after',
		};

		setDropAt(current => {
			if (current && current.columnName === data.columnName && current.location === data.location) return current;
			return data;
		});
	}, []);

	return { onItemDragStart, onItemDragOver, dropAt };
};
