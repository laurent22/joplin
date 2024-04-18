import * as React from 'react';
import { useCallback, useState, useRef, useMemo } from 'react';
import { registerGlobalDragEndEvent, unregisterGlobalDragEndEvent } from '../utils/dragAndDrop';
import { NoteListColumn, NoteListColumns } from '@joplin/lib/services/plugins/api/noteListType';
import Setting from '@joplin/lib/models/Setting';
import { findParentElementByClassName } from '@joplin/utils/dom';

interface DraggedHeader {
	name: string;
}

interface InsertAt {
	columnName: NoteListColumn['name'];
	location: 'before' | 'after';
	x: number;
}

export enum DataType {
	HeaderItem = 'text/x-jop-header-item',
	Resizer = 'text/x-jop-header-resizer',
}

interface DraggedItem {
	type: DataType;
	columnName: NoteListColumn['name'];
	initX: number;
	initBoundaries: number[];
}

const getHeader = (event: React.DragEvent) => {
	const dt = event.dataTransfer;
	const headerText = dt.getData(DataType.HeaderItem);
	if (!headerText) return null;
	return JSON.parse(headerText) as DraggedHeader;
};

const isDraggedHeaderItem = (event: React.DragEvent) => {
	return event.dataTransfer.types.includes(DataType.HeaderItem);
};

const isDraggedHeaderResizer = (event: React.DragEvent) => {
	return event.dataTransfer.types.includes(DataType.Resizer);
};

const getInsertAt = (event: React.DragEvent) => {
	const name = event.currentTarget.getAttribute('data-name') as NoteListColumn['name'];
	const rect = event.currentTarget.getBoundingClientRect();
	const x = event.clientX - rect.x;
	const percent = x / rect.width;

	const headerElement: Element = findParentElementByClassName(event.currentTarget, 'note-list-header');
	const headerRect = headerElement.getBoundingClientRect();

	const data: InsertAt = {
		columnName: name,
		location: percent < 0.5 ? 'before' : 'after',
		x: event.clientX - headerRect.x,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const setupDataTransfer = (event: React.DragEvent, dataType: string, image: HTMLImageElement, data: any) => {
	event.dataTransfer.setDragImage(image, 1, 1);
	event.dataTransfer.clearData();
	event.dataTransfer.setData(dataType, JSON.stringify(data));
	event.dataTransfer.effectAllowed = 'move';
};

const getEffectiveColumnWidths = (columns: NoteListColumns, totalWidth: number) => {
	let totalFixedWidth = 0;
	for (const c of columns) totalFixedWidth += c.width;

	const dynamicWidth = totalWidth - totalFixedWidth;

	const output: number[] = [];
	for (const c of columns) {
		output.push(c.width ? c.width : dynamicWidth);
	}

	return output;
};

const getColumnsToBoundaries = (columns: NoteListColumns, totalWidth: number) => {
	const widths = getEffectiveColumnWidths(columns, totalWidth);
	const boundaries: number[] = [0];
	let total = 0;
	for (const w of widths) {
		boundaries.push(total + w);
		total += w;
	}
	return boundaries;
};

const applyBoundariesToColumns = (columns: NoteListColumns, boundaries: number[]) => {
	const newColumns: NoteListColumns = [];
	let changed = false;
	for (let i = 0; i < columns.length; i++) {
		const column = columns[i];
		const previousWidth = column.width;
		const newWidth = column.width ? boundaries[i + 1] - boundaries[i] : 0;

		if (previousWidth !== newWidth) {
			changed = true;
		}

		newColumns.push({ ...column, width: newWidth });
	}
	return changed ? newColumns : columns;
};

export default (columns: NoteListColumns) => {
	const [dropAt, setDropAt] = useState<InsertAt|null>(null);
	const [draggedItem, setDraggedItem] = useState<DraggedItem|null>(null);
	const draggedItemRef = useRef<DraggedItem>(null);
	draggedItemRef.current = draggedItem;
	const columnsRef = useRef<NoteListColumns>(null);
	columnsRef.current = columns;

	// The drag and drop image needs to be created in advance to avoid the globe 🌐 cursor.
	// https://www.sam.today/blog/html5-dnd-globe-icon
	const emptyImage = useMemo(() => {
		const image = new Image(1, 1);
		image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
		return image;
	}, []);

	const onItemDragStart: React.DragEventHandler = useCallback(event => {
		if (event.dataTransfer.items.length) return;
		const name = event.currentTarget.getAttribute('data-name') as NoteListColumn['name'];

		setupDataTransfer(event, DataType.HeaderItem, emptyImage, { name });
		setDraggedItem({
			type: DataType.HeaderItem,
			columnName: name,
			initX: 0,
			initBoundaries: [],
		});
	}, [emptyImage]);

	const onItemDragOver: React.DragEventHandler = useCallback((event) => {
		if (!isDraggedHeaderItem(event)) return;

		const data = getInsertAt(event);

		setDropAt(current => {
			if (JSON.stringify(current) === JSON.stringify(data)) return current;
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

		if (JSON.stringify(newColumns) !== JSON.stringify(columns)) Setting.setValue('notes.columns', newColumns);
	}, [columns]);

	const onResizerDragOver: React.DragEventHandler = useCallback(event => {
		if (!isDraggedHeaderResizer(event)) return;

		// We use refs so that the identity of the `onResizerDragOver` callback doesn't change, so
		// that it can be removed as an event listener.
		const draggedItem = draggedItemRef.current;
		const columns = columnsRef.current;

		const deltaX = event.clientX - draggedItem.initX;
		const columnIndex = columns.findIndex(c => c.name === draggedItem.columnName);
		const initBoundary = draggedItem.initBoundaries[columnIndex];
		const minBoundary = columnIndex > 0 ? draggedItem.initBoundaries[columnIndex - 1] + 20 : 0;
		const maxBoundary = draggedItem.initBoundaries[columnIndex + 1] - 20;

		let newBoundary = initBoundary + deltaX;
		if (newBoundary < minBoundary) newBoundary = minBoundary;
		if (newBoundary > maxBoundary) newBoundary = maxBoundary;

		const newBoundaries = draggedItem.initBoundaries.slice();
		newBoundaries[columnIndex] = newBoundary;

		const newColumns = applyBoundariesToColumns(columns, newBoundaries);

		if (newColumns !== columns) Setting.setValue('notes.columns', newColumns);
	}, []);

	const onResizerDragEnd: React.DragEventHandler = useCallback(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		document.removeEventListener('dragover', onResizerDragOver as any);
	}, [onResizerDragOver]);

	const onResizerDragStart: React.DragEventHandler = useCallback(event => {
		const name = event.currentTarget.getAttribute('data-name') as NoteListColumn['name'];

		setupDataTransfer(event, DataType.Resizer, emptyImage, { name });

		const headerElement: Element = findParentElementByClassName(event.currentTarget, 'note-list-header');
		const headerRect = headerElement.getBoundingClientRect();
		const boundaries = getColumnsToBoundaries(columns, headerRect.width);

		setDraggedItem({
			type: DataType.Resizer,
			columnName: name,
			initX: event.clientX,
			initBoundaries: boundaries,
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		document.addEventListener('dragover', onResizerDragOver as any);
	}, [columns, onResizerDragOver, emptyImage]);

	return {
		onItemDragStart,
		onItemDragOver,
		onItemDrop,
		onResizerDragStart,
		onResizerDragEnd,
		dropAt,
		draggedItem,
	};
};
