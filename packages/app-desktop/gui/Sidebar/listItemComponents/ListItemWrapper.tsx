import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useMemo } from 'react';

interface Props {
	selected: boolean;
	itemIndex: number;
	itemCount: number;
	depth?: number;
	className?: string;
	children: (React.ReactNode[])|React.ReactNode;

	onDrag?: React.DragEventHandler;
	onDragStart?: React.DragEventHandler;
	onDragOver?: React.DragEventHandler;
	onDrop?: React.DragEventHandler;
	draggable?: boolean;
}

const ListItemWrapper: React.FC<Props> = props => {
	const style = useMemo(() => {
		return {
			'--depth': props.depth,
		} as React.CSSProperties;
	}, [props.depth]);
	
	return (
		<div
			aria-posinset={props.itemIndex + 1}
			aria-setsize={props.itemCount}
			aria-selected={props.selected}
			aria-level={props.depth}
			// Focus is handled directly by the item list
			tabIndex={-1}
			onDrag={props.onDrag}
			onDragStart={props.onDragStart}
			onDragOver={props.onDragOver}
			onDrop={props.onDrop}
			draggable={props.draggable}
			role='treeitem'
			className={`list-item-wrapper ${props.selected ? '-selected' : ''} ${props.className ?? ''}`}
			style={style}
		>
			{props.children}
		</div>
	);
};

export default ListItemWrapper;
