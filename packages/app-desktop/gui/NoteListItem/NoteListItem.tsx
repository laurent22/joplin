import * as React from 'react';
import { useCallback, forwardRef, LegacyRef, ChangeEvent, CSSProperties, MouseEventHandler, DragEventHandler, useMemo, memo } from 'react';
import { ItemFlow, ListRenderer, NoteListColumns, OnChangeEvent, OnChangeHandler } from '@joplin/lib/services/plugins/api/noteListType';
import { Size } from '@joplin/utils/types';
import useRootElement from './utils/useRootElement';
import useItemElement from './utils/useItemElement';
import useItemEventHandlers from './utils/useItemEventHandlers';
import { OnInputChange } from './utils/types';
import Note from '@joplin/lib/models/Note';
import { NoteEntity } from '@joplin/lib/services/database/types';
import useRenderedNote from './utils/useRenderedNote';
import { Dispatch } from 'redux';
import getNoteElementIdFromJoplinId from './utils/getNoteElementIdFromJoplinId';

interface NoteItemProps {
	dragIndex: number;
	flow: ItemFlow;
	highlightedWords: string[];
	index: number;
	isProvisional: boolean;
	itemSize: Size;
	noteCount: number;
	onChange: OnChangeHandler;
	onClick: MouseEventHandler<HTMLDivElement>;
	onDoubleClick: MouseEventHandler<HTMLDivElement>;
	onContextMenu: MouseEventHandler;
	onDragOver: DragEventHandler;
	onDragStart: DragEventHandler;
	style: CSSProperties;
	note: NoteEntity;
	isWatched: boolean;

	isSelected: boolean;
	tabIndex: number;
	focusVisible: boolean;

	listRenderer: ListRenderer;
	columns: NoteListColumns;
	dispatch: Dispatch;
}

const NoteListItem = (props: NoteItemProps, ref: LegacyRef<HTMLDivElement>) => {
	const noteId = props.note.id;
	const elementId = getNoteElementIdFromJoplinId(noteId);

	const onInputChange: OnInputChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
		const getValue = (element: HTMLInputElement) => {
			if (element.type === 'checkbox') return element.checked;
			if (element.type === 'text') return element.value;
			throw new Error(`Unsupported element: ${element.type}`);
		};

		const changeEvent: OnChangeEvent = {
			noteId: noteId,
			elementId: event.currentTarget.getAttribute('data-id'),
			value: getValue(event.currentTarget),
		};

		if (changeEvent.elementId === 'todo-checkbox') {
			await Note.save({
				id: changeEvent.noteId,
				todo_completed: changeEvent.value ? Date.now() : 0,
			}, { userSideValidation: true });

			props.dispatch({ type: 'NOTE_SORT' });
		} else {
			if (props.onChange) await props.onChange(changeEvent);
		}
	}, [props.onChange, noteId, props.dispatch]);

	const rootElement = useRootElement(elementId);

	const renderedNote = useRenderedNote(props.note, props.isSelected, props.isWatched, props.listRenderer, props.highlightedWords, props.index, props.columns);

	const itemElement = useItemElement(
		rootElement,
		noteId,
		renderedNote ? renderedNote.html : '',
		props.focusVisible,
		props.style,
		props.itemSize,
		props.onClick,
		props.onDoubleClick,
		props.flow,
	);

	useItemEventHandlers(rootElement, itemElement, onInputChange, null);

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
		tabIndex={props.tabIndex}
		className={className}
		data-id={noteId}
		style={{ height: props.itemSize.height }}
		onContextMenu={props.onContextMenu}
		onDragStart={props.onDragStart}
		onDragOver={props.onDragOver}

		aria-selected={props.isSelected}
		aria-posinset={1 + props.index}
		aria-setsize={props.noteCount}
		role='option'
	>
		<div className="dragcursor" style={dragCursorStyle}></div>
	</div>;
};

export default memo(forwardRef(NoteListItem));
