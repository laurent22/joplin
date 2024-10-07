import * as React from 'react';
import { useMemo } from 'react';

export type ListItemRef = React.Ref<HTMLDivElement>;

interface Props {
	containerRef: ListItemRef;
	selected: boolean;
	itemIndex: number;
	itemCount: number;
	expanded?: boolean|undefined;
	depth?: number;
	className?: string;
	children: (React.ReactNode[])|React.ReactNode;

	onDrag?: React.DragEventHandler;
	onDragStart?: React.DragEventHandler;
	onDragOver?: React.DragEventHandler;
	onDrop?: React.DragEventHandler;
	draggable?: boolean;
	'data-folder-id'?: string;
}

const ListItemWrapper: React.FC<Props> = props => {
	const style = useMemo(() => {
		return {
			'--depth': props.depth,
		} as React.CSSProperties;
	}, [props.depth]);

	return (
		<div
			ref={props.containerRef}
			aria-posinset={props.itemIndex + 1}
			aria-setsize={props.itemCount}
			aria-selected={props.selected}
			aria-expanded={props.expanded}
			// aria-level is 1-based, where depth is zero-based
			aria-level={props.depth + 1}
			tabIndex={props.selected ? 0 : -1}
			onDrag={props.onDrag}
			onDragStart={props.onDragStart}
			onDragOver={props.onDragOver}
			onDrop={props.onDrop}
			draggable={props.draggable}
			role='treeitem'
			className={`list-item-wrapper ${props.selected ? '-selected' : ''} ${props.className ?? ''}`}
			style={style}
			data-folder-id={props['data-folder-id']}
		>
			{props.children}
		</div>
	);
};

export default ListItemWrapper;
