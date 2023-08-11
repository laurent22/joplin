import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { OnChangeHandler } from './utils/types';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { waitForElement } from '@joplin/lib/dom';
import { msleep } from '@joplin/utils/time';

interface NoteItemProps {
	onClick: React.MouseEventHandler<HTMLDivElement>;
	onChange: OnChangeHandler;
	noteId: string;
	noteHtml: string;
	style: React.CSSProperties;
}

const NoteItem = (props: NoteItemProps) => {
	const [rootElement, setRootElement] = useState<HTMLDivElement>(null);
	const [itemElement, setItemElement] = useState<HTMLDivElement>(null);

	const elementId = `list-note-${props.noteId}`;
	const idPrefix = 'user-note-list-item-';

	const onCheckboxChange = useCallback((event: any) => {
		const internalId: string = event.currentTarget.getAttribute('id');
		const userId = internalId.substring(idPrefix.length);
		void props.onChange({ noteId: props.noteId }, userId, { value: event.currentTarget.checked });
	}, [props.onChange, props.noteId]);

	useAsyncEffect(async (event) => {
		const element = await waitForElement(document, elementId);
		if (event.cancelled) return;
		setRootElement(element);
	}, [document, elementId]);

	useEffect(() => {
		if (!rootElement) return () => {};

		const element = document.createElement('div');
		element.setAttribute('data-note-id', props.noteId);
		element.className = 'note-list-item';
		for (const [n, v] of Object.entries(props.style)) {
			(element.style as any)[n] = v;
		}
		element.innerHTML = props.noteHtml;
		element.addEventListener('click', props.onClick as any);

		rootElement.appendChild(element);

		setItemElement(element);

		return () => {
			// TODO: do event handlers need to be removed if the element is removed?
			// element.removeEventListener('click', props.onClick as any);
			element.remove();
		};
	}, [rootElement, props.noteHtml, props.noteId, props.style, props.onClick, onCheckboxChange]);

	useAsyncEffect(async (event) => {
		if (!itemElement) return;

		await msleep(1);
		if (event.cancelled) return;

		const inputs = itemElement.getElementsByTagName('input');

		const all = rootElement.getElementsByTagName('*');

		for (let i = 0; i < all.length; i++) {
			const e = all[i];
			if (e.getAttribute('id')) {
				e.setAttribute('id', idPrefix + e.getAttribute('id'));
			}
		}

		for (const input of inputs) {
			if (input.type === 'checkbox') {
				input.addEventListener('change', onCheckboxChange);
			}
		}
	}, [itemElement]);

	return <div id={elementId}></div>;
};

export default NoteItem;
