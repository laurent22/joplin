import { useState, useEffect } from 'react';
import KeymapService, { KeymapItem, KeymapError } from '../../../lib/services/KeymapService';

const keymapService = KeymapService.instance();

const useKeymap = (): [KeymapItem[], KeymapError, (commandName: string, accelerator: string) => void] => {
	const [keymap, setKeymap] = useState<KeymapItem[]>(() => keymapService.getKeymap());
	const [keymapError, setKeymapError] = useState<KeymapError>(null);

	const setAccelerator = (commandName: string, accelerator: string) => {
		setKeymap(prevKeymap => {
			const newKeymap = [...prevKeymap];

			newKeymap.find(item => item.command === commandName).accelerator = accelerator || null;
			return newKeymap;
		});
	};

	useEffect(() => {
		try {
			// Save changes to the drive
			keymapService.saveKeymap();
			keymapService.setKeymap(keymap);
			setKeymapError(null);
		} catch (err) {
			setKeymapError(err);
		}
	}, [keymap]);

	return [keymap, keymapError, setAccelerator];
};

export default useKeymap;
