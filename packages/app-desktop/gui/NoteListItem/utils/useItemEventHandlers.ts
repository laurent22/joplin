import { OnClick, OnInputChange } from './types';
import { useEffect } from 'react';

const useItemEventHandlers = (rootElement: HTMLDivElement, itemElement: HTMLDivElement, onInputChange: OnInputChange, onClick: OnClick) => {
	useEffect(() => {
		if (!itemElement) return () => {};

		const inputs = itemElement.getElementsByTagName('input');

		const processedCheckboxes: HTMLInputElement[] = [];
		const processedTextInputs: HTMLInputElement[] = [];

		for (const input of inputs) {
			if (input.type === 'checkbox') {
				input.addEventListener('change', onInputChange as any);
				processedCheckboxes.push(input);
			}

			if (input.type === 'text') {
				input.addEventListener('change', onInputChange as any);
				processedTextInputs.push(input);
			}
		}

		const buttons = itemElement.getElementsByTagName('button');
		const processedButtons: HTMLButtonElement[] = [];

		if (onClick) {
			for (const button of buttons) {
				button.addEventListener('click', onClick as any);
				processedButtons.push(button);
			}
		}

		return () => {
			for (const input of processedCheckboxes) {
				input.removeEventListener('change', onInputChange as any);
			}

			for (const input of processedTextInputs) {
				input.removeEventListener('change', onInputChange as any);
			}

			for (const button of processedButtons) {
				button.removeEventListener('click', onClick as any);
			}
		};
	}, [itemElement, rootElement, onInputChange, onClick]);
};

export default useItemEventHandlers;
