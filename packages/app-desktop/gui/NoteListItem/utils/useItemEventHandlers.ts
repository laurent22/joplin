import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { msleep } from '@joplin/utils/time';
import { OnCheckboxChange } from './types';
import { useEffect, useState } from 'react';

const useItemEventHandlers = (rootElement: HTMLDivElement, itemElement: HTMLDivElement, idPrefix: string, onCheckboxChange: OnCheckboxChange) => {
	const [modifiedInputs, setModifiedInputs] = useState<HTMLInputElement[]>([]);

	useAsyncEffect(async (event) => {
		if (!itemElement) return;

		await msleep(1);
		if (event.cancelled) return;

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
				mods.push(input);
			}
		}

		setModifiedInputs(mods);
	}, [itemElement, idPrefix, rootElement]);

	useEffect(() => {
		for (const input of modifiedInputs) {
			input.addEventListener('change', onCheckboxChange as any);
		}

		return () => {
			for (const input of modifiedInputs) {
				input.removeEventListener('change', onCheckboxChange as any);
			}
		};
	}, [modifiedInputs, onCheckboxChange]);
};

export default useItemEventHandlers;
