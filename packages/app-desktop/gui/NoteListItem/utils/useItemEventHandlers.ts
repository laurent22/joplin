import { OnCheckboxChange } from './types';
import { useEffect } from 'react';

const useItemEventHandlers = (rootElement: HTMLDivElement, itemElement: HTMLDivElement, idPrefix: string, onCheckboxChange: OnCheckboxChange) => {
	useEffect(() => {
		if (!itemElement) return () => {};

		const inputs = itemElement.getElementsByTagName('input');

		const all = rootElement.getElementsByTagName('*');

		for (let i = 0; i < all.length; i++) {
			const e = all[i];
			if (e.getAttribute('id') && e.getAttribute('data---joplin-id-processed') !== '1') {
				e.setAttribute('data---joplin-id-processed', '1');
				e.setAttribute('id', idPrefix + e.getAttribute('id'));
			}
		}

		const mods: HTMLInputElement[] = [];

		for (const input of inputs) {
			if (input.type === 'checkbox') {
				input.addEventListener('change', onCheckboxChange as any);
				mods.push(input);
			}
		}

		return () => {
			for (const input of mods) {
				input.removeEventListener('change', onCheckboxChange as any);
			}
		};
	}, [itemElement, idPrefix, rootElement, onCheckboxChange]);
};

export default useItemEventHandlers;
