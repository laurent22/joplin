import * as React from 'react';
import { Size } from '@joplin/utils/types';
import { useEffect, useState } from 'react';
import { ItemFlow } from '../../NoteList/utils/types';

const useItemElement = (rootElement: HTMLDivElement, noteId: string, noteHtml: string, style: any, itemSize: Size, onClick: React.MouseEventHandler<HTMLDivElement>, flow: ItemFlow) => {
	const [itemElement, setItemElement] = useState<HTMLDivElement>(null);

	useEffect(() => {
		if (!rootElement) return () => {};

		const element = document.createElement('div');
		element.setAttribute('data-id', noteId);
		element.className = 'note-list-item';
		for (const [n, v] of Object.entries(style)) {
			(element.style as any)[n] = v;
		}
		if (flow === ItemFlow.LeftToRight) element.style.width = `${itemSize.width}px`;
		element.style.height = `${itemSize.height}px`;
		element.innerHTML = noteHtml;
		element.addEventListener('click', onClick as any);

		rootElement.appendChild(element);

		setItemElement(element);

		return () => {
			element.remove();
		};
	}, [rootElement, itemSize, noteHtml, noteId, style, onClick, flow]);

	return itemElement;
};

export default useItemElement;
