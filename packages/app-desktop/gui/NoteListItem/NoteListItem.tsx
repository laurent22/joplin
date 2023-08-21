import * as React from 'react';
import { useCallback, forwardRef, LegacyRef, ChangeEvent, CSSProperties, MouseEventHandler, DragEventHandler, useMemo, memo } from 'react';
import { ItemFlow, OnChangeHandler } from '../NoteList/utils/types';
import { Size } from '@joplin/utils/types';
import useRootElement from './utils/useRootElement';
import useItemElement from './utils/useItemElement';
import useItemEventHandlers from './utils/useItemEventHandlers';
import { OnCheckboxChange } from './utils/types';

interface NoteItemProps {
	dragIndex: number;
	flow: ItemFlow;
	highlightedWords: string[];
	index: number;
	isProvisional: boolean;
	itemSize: Size;
	noteCount: number;
	noteHtml: string;
	noteId: string;
	onChange: OnChangeHandler;
	onClick: MouseEventHandler<HTMLDivElement>;
	onContextMenu: MouseEventHandler;
	onDragOver: DragEventHandler;
	onDragStart: DragEventHandler;
	style: CSSProperties;
}

const NoteListItem = (props: NoteItemProps, ref: LegacyRef<HTMLDivElement>) => {
	const elementId = `list-note-${props.noteId}`;

	const onCheckboxChange: OnCheckboxChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		void props.onChange(
			{ noteId: props.noteId },
			event.currentTarget.getAttribute('data-id'),
			{ value: event.currentTarget.checked }
		);
	}, [props.onChange, props.noteId]);

	const rootElement = useRootElement(elementId);

	const itemElement = useItemElement(
		rootElement,
		props.noteId,
		props.noteHtml,
		props.style,
		props.itemSize,
		props.onClick,
		props.flow
	);

	useItemEventHandlers(rootElement, itemElement, onCheckboxChange);

	const className = useMemo(() => {
		return [
			'note-list-item-wrapper',

			// This is not used by the app, but kept here because it may be used
			// by users for custom CSS.
			(props.index + 1) % 2 === 0 ? 'even' : 'odd',

			props.isProvisional && '-provisional',
		].filter(e => !!e).join(' ');
	}, [props.index, props.isProvisional]);

	const isActiveDragItem = props.dragIndex === props.index;
	const isLastActiveDragItem = props.index === props.noteCount - 1 && props.dragIndex >= props.noteCount;

	const dragCursorStyle = useMemo(() => {
		if (props.flow === ItemFlow.TopToBottom) {
			let dragItemPosition = '';
			if (isActiveDragItem) {
				dragItemPosition = 'top';
			} else if (isLastActiveDragItem) {
				dragItemPosition = 'bottom';
			}

			const output: React.CSSProperties = {
				width: props.itemSize.width,
				display: dragItemPosition ? 'block' : 'none',
				left: 0,
			};

			if (dragItemPosition === 'top') {
				output.top = 0;
			} else {
				output.bottom = 0;
			}

			return output;
		}

		if (props.flow === ItemFlow.LeftToRight) {
			let dragItemPosition = '';
			if (isActiveDragItem) {
				dragItemPosition = 'left';
			} else if (isLastActiveDragItem) {
				dragItemPosition = 'right';
			}

			const output: React.CSSProperties = {
				height: props.itemSize.height,
				display: dragItemPosition ? 'block' : 'none',
				top: 0,
			};

			if (dragItemPosition === 'left') {
				output.left = 0;
			} else {
				output.right = 0;
			}

			return output;
		}

		throw new Error('Unreachable');
	}, [isActiveDragItem, isLastActiveDragItem, props.flow, props.itemSize]);

	return <div
		id={elementId}
		ref={ref}
		draggable={true}
		tabIndex={0}
		className={className}
		data-id={props.noteId}
		onContextMenu={props.onContextMenu}
		onDragStart={props.onDragStart}
		onDragOver={props.onDragOver}
	>
		<div className="dragcursor" style={dragCursorStyle}></div>
	</div>;
};

export default memo(forwardRef(NoteListItem));
