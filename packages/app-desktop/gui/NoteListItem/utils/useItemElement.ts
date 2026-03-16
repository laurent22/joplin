import * as React from 'react';
import { Size } from '@joplin/utils/types';
import { useEffect, useRef } from 'react';
import { ItemFlow } from '@joplin/lib/services/plugins/api/noteListType';
import { ItemEventHandlers } from './types';

const addItemEventListeners = (
	element: HTMLElement,
	listeners: ItemEventHandlers,
	onClick: React.MouseEventHandler<HTMLDivElement>,
	onDoubleClick: React.MouseEventHandler<HTMLDivElement>,
): { cleanup: ()=> void } => {
	const processedInputs: HTMLInputElement[] = [];
	const processedButtons: HTMLButtonElement[] = [];

	const inputs = element.getElementsByTagName('input');
	for (const input of inputs) {
		if (input.type === 'checkbox' || input.type === 'text') {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- we're mixing React synthetic events with DOM events which ideally should not be done but it is fine in this particular case
			input.addEventListener('change', listeners.onInputChange as any);
			processedInputs.push(input);
		}
	}

	const buttons = element.getElementsByTagName('button');
	if (listeners.onClick) {
		for (const button of buttons) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- we're mixing React synthetic events with DOM events which ideally should not be done but it is fine in this particular case
			button.addEventListener('click', listeners.onClick as any);
			processedButtons.push(button);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- we're mixing React synthetic events with DOM events which ideally should not be done but it is fine in this particular case
	const clickHandler = (e: MouseEvent) => onClick(e as any);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- we're mixing React synthetic events with DOM events which ideally should not be done but it is fine in this particular case
	const dblclickHandler = (e: MouseEvent) => onDoubleClick(e as any);
	element.addEventListener('click', clickHandler);
	element.addEventListener('dblclick', dblclickHandler);

	return {
		cleanup: () => {
			for (const input of processedInputs) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- we're mixing React synthetic events with DOM events which ideally should not be done but it is fine in this particular case
				input.removeEventListener('change', listeners.onInputChange as any);
			}
			if (listeners.onClick) {
				for (const button of processedButtons) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- we're mixing React synthetic events with DOM events which ideally should not be done but it is fine in this particular case
					button.removeEventListener('click', listeners.onClick as any);
				}
			}
			element.removeEventListener('click', clickHandler);
			element.removeEventListener('dblclick', dblclickHandler);
		},
	};
};

const useItemElement = (
	rootElement: HTMLDivElement | null, noteId: string, noteHtml: string, focusVisible: boolean, style: React.CSSProperties, itemSize: Size, onClick: React.MouseEventHandler<HTMLDivElement>, onDoubleClick: React.MouseEventHandler<HTMLDivElement>, flow: ItemFlow, itemEventHandlers: ItemEventHandlers,
) => {
	const itemElement = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!rootElement) return () => {};

		const element = document.createElement('div');
		element.setAttribute('data-id', noteId);
		element.className = 'note-list-item';
		for (const [n, v] of Object.entries(style)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			(element.style as any)[n] = v;
		}
		if (flow === ItemFlow.LeftToRight) element.style.width = `${itemSize.width}px`;
		element.style.height = `${itemSize.height}px`;
		element.innerHTML = noteHtml;

		const { cleanup } = addItemEventListeners(element, itemEventHandlers, onClick, onDoubleClick);

		rootElement.appendChild(element);
		itemElement.current = element;

		return () => {
			cleanup();
			itemElement.current = null;
			element.remove();
		};
	}, [rootElement, itemSize, noteHtml, noteId, flow, style, onClick, onDoubleClick, itemEventHandlers]);

	useEffect(() => {
		const element = itemElement.current;
		if (!element) return;
		if (focusVisible) {
			element.classList.add('-focus-visible');
		} else {
			element.classList.remove('-focus-visible');
		}
	}, [focusVisible]);

	return itemElement;
};

export default useItemElement;
