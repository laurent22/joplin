import * as React from 'react';
import { useMemo } from 'react';
import { NoteListColumns, OnClickHandler } from '@joplin/lib/services/plugins/api/noteListType';
import { CSSProperties } from 'styled-components';
import NoteListHeaderItem from './NoteListHeaderItem';
import { OnItemClickHander } from './types';
import useDragAndDrop, { DataType } from './useDragAndDrop';
import useContextMenu from './utils/useContextMenu';
import depNameToNoteProp from '@joplin/lib/services/noteList/depNameToNoteProp';

interface Props {
	template: string;
	height: number;
	onClick: OnClickHandler;
	columns: NoteListColumns;
	notesSortOrderField: string;
	notesSortOrderReverse: boolean;
	onItemClick: OnItemClickHander;
}

const defaultHeight = 26;

export default (props: Props) => {
	const { onItemDragStart, onItemDragOver, onItemDrop, onResizerDragStart, onResizerDragEnd, dropAt, draggedItem } = useDragAndDrop(props.columns);
	const onContextMenu = useContextMenu(props.columns);

	const items: React.JSX.Element[] = [];

	let isFirst = true;
	for (const column of props.columns) {
		let dragCursorLocation = null;
		if (draggedItem && draggedItem.type === DataType.HeaderItem) {
			dragCursorLocation = dropAt && dropAt.columnName === column.name ? dropAt.location : null;
		}

		items.push(<NoteListHeaderItem
			isFirst={isFirst}
			key={column.name}
			column={column}
			isCurrent={`note.${props.notesSortOrderField}` === depNameToNoteProp(column.name)}
			isReverse={props.notesSortOrderReverse}
			onClick={props.onItemClick}
			onDragStart={onItemDragStart}
			onDragOver={onItemDragOver}
			onDrop={onItemDrop}
			onResizerDragStart={onResizerDragStart}
			onResizerDragEnd={onResizerDragEnd}
			dragCursorLocation={dragCursorLocation}
		/>);
		isFirst = false;
	}

	const itemHeight = props.height ? props.height : defaultHeight;

	const style = useMemo(() => {
		return { height: itemHeight } as CSSProperties;
	}, [itemHeight]);

	return (
		<div className="note-list-header" style={style} onContextMenu={onContextMenu} >
			{items}
		</div>
	);
};
