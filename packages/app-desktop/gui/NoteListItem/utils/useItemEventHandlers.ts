import * as React from 'react';
import { OnClick, OnInputChange } from './types';
import { useEffect } from 'react';

const useItemEventHandlers = (rootElement: HTMLDivElement, itemElementOrRef: HTMLDivElement | React.RefObject<HTMLDivElement | null>, onInputChange: OnInputChange, onClick: OnClick) => {
	useEffect(() => {
		const itemElement: HTMLDivElement | null = itemElementOrRef && typeof itemElementOrRef === 'object' && 'current' in itemElementOrRef
			? (itemElementOrRef as React.RefObject<HTMLDivElement | null>).current
			: (itemElementOrRef as HTMLDivElement);
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
	}, [itemElementOrRef, rootElement, onInputChange, onClick]);
};

export default useItemEventHandlers;
