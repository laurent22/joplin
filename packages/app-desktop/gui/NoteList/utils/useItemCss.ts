import { useEffect } from 'react';

const useItemCss = (itemCss: string) => {
	useEffect(() => {
		const element = document.createElement('style');
		element.setAttribute('type', 'text/css');
		element.appendChild(document.createTextNode(`
			.note-list-item {
				${itemCss};
			}
		`));
		document.head.appendChild(element);
		return () => {
			element.remove();
		};
	}, [itemCss]);
};

export default useItemCss;
