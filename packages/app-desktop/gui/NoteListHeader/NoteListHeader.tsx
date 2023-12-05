import { useCallback, useEffect, useState } from 'react';
import useRootElement from '../NoteListItem/utils/useRootElement';
import useItemEventHandlers from '../NoteListItem/utils/useItemEventHandlers';
import { OnClickHandler } from '@joplin/lib/services/plugins/api/noteListType';

interface Props {
	template: string;
	height: number;
	onClick: OnClickHandler;
}

const rootElementId = 'note-list-header';
const defaultHeight = 22;

const useContentElement = (rootElement:HTMLDivElement, height:number, template:string) => {
	const [contentElement, setContentElement] = useState<HTMLDivElement>(null)
	useEffect(() => {
		if (!rootElement) return () => {};
		const element = document.createElement('div');
		element.className = 'note-list-header-content';
		element.style.height = `${height}px`;
		element.innerHTML = template;
		rootElement.appendChild(element);
		setContentElement(element);
		return () => {
			element.remove();
		};
	}, [rootElement, height, template]);
	return contentElement;
}

export default (props:Props) => {
	const onHeaderClick = useCallback((event:React.MouseEvent<HTMLElement>) => {
		if (!props.onClick) return;
		const elementId = event.currentTarget.getAttribute('data-id');
		props.onClick({ elementId });
	}, []);

	const rootElement = useRootElement(rootElementId);
	const height = props.height === undefined ? defaultHeight : props.height;
	const contentElement = useContentElement(rootElement, height, props.template);
	useItemEventHandlers(rootElement, contentElement, null, onHeaderClick);
	
	return <div
		id={rootElementId}
	>
	</div>;
}