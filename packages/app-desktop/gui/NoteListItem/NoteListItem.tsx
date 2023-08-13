import * as React from 'react';
import { useCallback, forwardRef, LegacyRef, ChangeEvent, CSSProperties, MouseEventHandler, DragEventHandler } from 'react';
import { OnChangeHandler } from '../NoteList/utils/types';
import { Size } from '@joplin/utils/types';
import useRootElement from './utils/useRootElement';
import useItemElement from './utils/useItemElement';
import useItemEventHandlers from './utils/useItemEventHandlers';
import { OnCheckboxChange } from './utils/types';

interface NoteItemProps {
	itemSize: Size;
	noteHtml: string;
	noteId: string;
	onChange: OnChangeHandler;
	onClick: MouseEventHandler<HTMLDivElement>;
	onContextMenu: MouseEventHandler;
	onDragStart: DragEventHandler;
	onDragOver: DragEventHandler;
	style: CSSProperties;
}

const NoteListItem = (props: NoteItemProps, ref: LegacyRef<HTMLDivElement>) => {
	const elementId = `list-note-${props.noteId}`;
	const idPrefix = 'user-note-list-item-';

	const onCheckboxChange: OnCheckboxChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		const internalId: string = event.currentTarget.getAttribute('id');
		const userId = internalId.substring(idPrefix.length);
		void props.onChange({ noteId: props.noteId }, userId, { value: event.currentTarget.checked });
	}, [props.onChange, props.noteId]);

	const rootElement = useRootElement(elementId);

	const itemElement = useItemElement(
		rootElement,
		props.noteId,
		props.noteHtml,
		props.style,
		props.itemSize,
		props.onClick
	);

	useItemEventHandlers(rootElement, itemElement, idPrefix, onCheckboxChange);

	return <div
		id={elementId}
		ref={ref}
		tabIndex={0}
		data-id={props.noteId}
		onContextMenu={props.onContextMenu}
		onDragStart={props.onDragStart}
		onDragOver={props.onDragOver}
	></div>;
};

export default forwardRef(NoteListItem);
