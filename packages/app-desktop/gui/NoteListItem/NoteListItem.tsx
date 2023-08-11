import * as React from 'react';
import { useCallback } from 'react';
import { OnChangeHandler } from '../NoteList/utils/types';
import { Size } from '@joplin/utils/types';
import useRootElement from './utils/useRootElement';
import useItemElement from './utils/useItemElement';
import useItemEventHandlers from './utils/useItemEventHandlers';
import { OnCheckboxChange } from './utils/types';

interface NoteItemProps {
	onClick: React.MouseEventHandler<HTMLDivElement>;
	onChange: OnChangeHandler;
	noteId: string;
	noteHtml: string;
	style: React.CSSProperties;
	itemSize: Size;
}

const NoteListItem = (props: NoteItemProps) => {
	const elementId = `list-note-${props.noteId}`;
	const idPrefix = 'user-note-list-item-';

	const onCheckboxChange: OnCheckboxChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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

	return <div id={elementId}></div>;
};

export default NoteListItem;
