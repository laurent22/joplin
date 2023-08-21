import { OnCheckboxChange } from './types';
import { useEffect } from 'react';

const useItemEventHandlers = (rootElement: HTMLDivElement, itemElement: HTMLDivElement, onCheckboxChange: OnCheckboxChange) => {
	useEffect(() => {
		if (!itemElement) return () => {};

		const inputs = itemElement.getElementsByTagName('input');

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
	}, [itemElement, rootElement, onCheckboxChange]);
};

export default useItemEventHandlers;
