import * as React from 'react';
import { Size } from '@joplin/utils/types';
import { useEffect, useState } from 'react';
import { ItemFlow } from '@joplin/lib/services/plugins/api/noteListType';

const useItemElement = (
	rootElement: HTMLDivElement, noteId: string, noteHtml: string, focusVisible: boolean, style: React.CSSProperties, itemSize: Size, onClick: React.MouseEventHandler<HTMLDivElement>, flow: ItemFlow,
) => {
	const [itemElement, setItemElement] = useState<HTMLDivElement>(null);

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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		element.addEventListener('click', onClick as any);

		rootElement.appendChild(element);

		setItemElement(element);

		return () => {
			element.remove();
		};
	}, [rootElement, itemSize, noteHtml, noteId, style, onClick, flow]);

	useEffect(() => {
		if (!itemElement) return;

		if (focusVisible) {
			itemElement.classList.add('-focus-visible');
		} else {
			itemElement.classList.remove('-focus-visible');
		}
	}, [focusVisible, itemElement]);

	return itemElement;
};

export default useItemElement;
