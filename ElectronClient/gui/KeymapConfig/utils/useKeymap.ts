import { useState, useEffect } from 'react';
import KeymapService, { KeymapItem, KeymapError } from '../../../lib/services/KeymapService';

const useKeymap = (): [KeymapItem[], (commandName: string, accelerator: string) => void, KeymapError] => {
	const keymapService = KeymapService.instance();

	const [keymap, setKeymap] = useState<KeymapItem[]>(() => keymapService.getKeymap());
	const [error, setError] = useState<KeymapError>(null);

	const setAccelerator = (commandName: string, accelerator: string) => {
		setKeymap(prevKeymap => {
			const newKeymap = [...prevKeymap];

			newKeymap.find(item => item.command === commandName).accelerator = accelerator || null;
			return newKeymap;
		});
	};

	useEffect(() => {
		try {
			keymapService.setKeymap(keymap);
			// Save changes to the disk
			keymapService.saveKeymap();
			setError(null);
		} catch (err) {
			setError(err);
		}
	}, [keymap]);

	return [keymap, setAccelerator, error];
};

export default useKeymap;
