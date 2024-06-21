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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				input.addEventListener('change', onInputChange as any);
				processedCheckboxes.push(input);
			}

			if (input.type === 'text') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				input.addEventListener('change', onInputChange as any);
				processedTextInputs.push(input);
			}
		}

		const buttons = itemElement.getElementsByTagName('button');
		const processedButtons: HTMLButtonElement[] = [];

		if (onClick) {
			for (const button of buttons) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				button.addEventListener('click', onClick as any);
				processedButtons.push(button);
			}
		}

		return () => {
			for (const input of processedCheckboxes) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				input.removeEventListener('change', onInputChange as any);
			}

			for (const input of processedTextInputs) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				input.removeEventListener('change', onInputChange as any);
			}

			for (const button of processedButtons) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				button.removeEventListener('click', onClick as any);
			}
		};
	}, [itemElement, rootElement, onInputChange, onClick]);
};

export default useItemEventHandlers;
