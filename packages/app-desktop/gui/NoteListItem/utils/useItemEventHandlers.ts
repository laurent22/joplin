import { OnInputChange } from './types';
import { useEffect } from 'react';

const useItemEventHandlers = (rootElement: HTMLDivElement, itemElement: HTMLDivElement, onInputChange: OnInputChange) => {
	useEffect(() => {
		if (!itemElement) return () => {};

		const inputs = itemElement.getElementsByTagName('input');

		const checkboxes: HTMLInputElement[] = [];
		const textInputs: HTMLInputElement[] = [];

		for (const input of inputs) {
			if (input.type === 'checkbox') {
				input.addEventListener('change', onInputChange as any);
				checkboxes.push(input);
			}

			if (input.type === 'text') {
				input.addEventListener('change', onInputChange as any);
				textInputs.push(input);
			}
		}

		return () => {
			for (const input of checkboxes) {
				input.removeEventListener('change', onInputChange as any);
			}

			for (const input of textInputs) {
				input.removeEventListener('change', onInputChange as any);
			}
		};
	}, [itemElement, rootElement, onInputChange]);
};

export default useItemEventHandlers;
