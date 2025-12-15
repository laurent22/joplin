import { ModelType } from '@joplin/lib/BaseModel';
import * as React from 'react';
import { useMemo } from 'react';

export type ListItemRef = React.Ref<HTMLDivElement>;

export interface ItemSelectionState {
	selected: boolean;
	// The item with primary selection is used for actions that support only one folder.
	// Only one item can have primary selection.
	primarySelected: boolean;

	multipleItemsSelected: boolean;
}

interface Props {
	containerRef: ListItemRef;
	selectionState: ItemSelectionState;
	itemIndex: number;
	itemCount: number;
	expanded?: boolean|undefined;
	depth: number;
	className?: string;
	highlightOnHover: boolean;
	children: (React.ReactNode[])|React.ReactNode;

	onContextMenu?: React.MouseEventHandler;
	onDrag?: React.DragEventHandler;
	onDragStart?: React.DragEventHandler;
	onDragOver?: React.DragEventHandler;
	onDrop?: React.DragEventHandler;
	draggable?: boolean;
	'data-folder-id'?: string;
	'data-id'?: string;
	'data-tag-id'?: string;
	'data-type'?: ModelType;
	'aria-labelledby'?: string;
}

const ListItemWrapper: React.FC<Props> = props => {
	const style = useMemo(() => {
		return {
			'--depth': props.depth,
		} as React.CSSProperties;
	}, [props.depth]);

	const { selected, primarySelected, multipleItemsSelected } = props.selectionState;

	return (
		<div
			ref={props.containerRef}
			aria-posinset={props.itemIndex + 1}
			aria-setsize={props.itemCount}
			aria-selected={selected}
			aria-expanded={props.expanded}
			aria-level={props.depth}
			tabIndex={primarySelected ? 0 : -1}

			onContextMenu={props.onContextMenu}
			onDrag={props.onDrag}
			onDragStart={props.onDragStart}
			onDragOver={props.onDragOver}
			onDrop={props.onDrop}
			draggable={props.draggable}

			role='treeitem'
			className={[
				'list-item-wrapper',
				props.highlightOnHover ? '-highlight-on-hover' : '',
				selected ? '-selected' : '',
				primarySelected && multipleItemsSelected ? '-selected-primary' : '',
				props.className ?? '',
			].join(' ')}
			style={style}
			data-folder-id={props['data-folder-id']}
			data-id={props['data-id']}
			data-index={props.itemIndex}
			data-tag-id={props['data-tag-id']}
			data-type={props['data-type']}
			aria-labelledby={props['aria-labelledby']}
		>
			{props.children}
		</div>
	);
};

export default ListItemWrapper;
