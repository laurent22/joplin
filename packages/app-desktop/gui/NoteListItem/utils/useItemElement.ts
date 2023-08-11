import * as React from 'react';
import { Size } from '@joplin/utils/types';
import { useEffect, useState } from 'react';

const useItemElement = (rootElement: HTMLDivElement, noteId: string, noteHtml: string, style: any, itemSize: Size, onClick: React.MouseEventHandler<HTMLDivElement>) => {
	const [itemElement, setItemElement] = useState<HTMLDivElement>(null);

	useEffect(() => {
		if (!rootElement) return () => {};

		const element = document.createElement('div');
		element.setAttribute('data-note-id', noteId);
		element.className = 'note-list-item';
		for (const [n, v] of Object.entries(style)) {
			(element.style as any)[n] = v;
		}
		element.style.height = `${itemSize.height}px`;
		element.innerHTML = noteHtml;
		element.addEventListener('click', onClick as any);

		rootElement.appendChild(element);

		setItemElement(element);

		return () => {
			element.remove();
		};
	}, [rootElement, itemSize, noteHtml, noteId, style, onClick]);

	return itemElement;
};

export default useItemElement;
