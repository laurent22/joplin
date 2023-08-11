import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { msleep } from '@joplin/utils/time';
import { OnCheckboxChange } from './types';

const useItemEventHandlers = (rootElement: HTMLDivElement, itemElement: HTMLDivElement, idPrefix: string, onCheckboxChange: OnCheckboxChange) => {
	useAsyncEffect(async (event) => {
		if (!itemElement) return;

		await msleep(1);
		if (event.cancelled) return;

		const inputs = itemElement.getElementsByTagName('input');

		const all = rootElement.getElementsByTagName('*');

		for (let i = 0; i < all.length; i++) {
			const e = all[i];
			if (e.getAttribute('id')) {
				e.setAttribute('id', idPrefix + e.getAttribute('id'));
			}
		}

		for (const input of inputs) {
			if (input.type === 'checkbox') {
				input.addEventListener('change', onCheckboxChange as any);
			}
		}
	}, [itemElement]);
};

export default useItemEventHandlers;
