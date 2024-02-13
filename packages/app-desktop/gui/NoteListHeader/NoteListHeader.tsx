import * as React from 'react';
import { useMemo } from 'react';
import { OnClickHandler } from '@joplin/lib/services/plugins/api/noteListType';
import { CSSProperties } from 'styled-components';
import { Column } from '../NoteList/utils/types';
import NoteListHeaderItem from './NoteListHeaderItem';
import { OnItemClickHander } from './types';
import useDragAndDrop from './useDragAndDrop';

interface Props {
	template: string;
	height: number;
	onClick: OnClickHandler;
	columns: Column[];
	notesSortOrderField: string;
	notesSortOrderReverse: boolean;
	onItemClick: OnItemClickHander;
}

const defaultHeight = 26;

export default (props: Props) => {
	const { onItemDragStart, onItemDragOver, dropAt } = useDragAndDrop();

	const items: React.JSX.Element[] = [];

	let isFirst = true;
	for (const column of props.columns) {
		items.push(<NoteListHeaderItem
			isFirst={isFirst}
			key={column.name}
			column={column}
			isCurrent={`note.${props.notesSortOrderField}` === column.name}
			isReverse={props.notesSortOrderReverse}
			onClick={props.onItemClick}
			onDragStart={onItemDragStart}
			onDragOver={onItemDragOver}
			dragCursorLocation={dropAt && dropAt.columnName === column.name ? dropAt.location : null}
		/>);
		isFirst = false;
	}

	const itemHeight = props.height ? props.height : defaultHeight;

	const style = useMemo(() => {
		return { height: itemHeight } as CSSProperties;
	}, [itemHeight]);

	return (
		<div className="note-list-header" style={style}>
			{items}
		</div>
	);
};
