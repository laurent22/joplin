import { useState, useEffect } from 'react';
import KeymapService, { KeymapItem, KeymapError } from '../../../lib/services/KeymapService';

const keymapService = KeymapService.instance();

const useKeymap = (): [KeymapItem[], KeymapError, (keymapItems: KeymapItem[]) => void, (commandName: string, accelerator: string) => void] => {
	const [keymap, setKeymap] = useState<KeymapItem[]>(() => keymapService.getKeymap());
	const [keymapError, setKeymapError] = useState<KeymapError>(null);

	const setAccelerator = (commandName: string, accelerator: string) => {
		setKeymap(prevKeymap => {
			const newKeymap = [...prevKeymap];

			newKeymap.find(item => item.command === commandName).accelerator = accelerator || null;
			return newKeymap;
		});
	};

	const setKeymapWrapper = (keymapItems: KeymapItem[]) => {
		const oldKeymap = [...keymap];

		// Avoid new changes being merged with the old changes
		keymapService.initialize();
		try {
			// Update the in-memory keymap of KeymapService
			keymapService.overrideKeymap(keymapItems);
			// Synchronize the state with KeymapService
			// Side-effect: Changes will also be saved to the disk
			setKeymap(keymapService.getKeymap());
		} catch (err) {
			// Avoid partially-loading keymap files
			keymapService.overrideKeymap(oldKeymap);
			throw err;
		}
	};

	useEffect(() => {
		try {
			keymapService.overrideKeymap(keymap);
			// Save changes to the disk
			keymapService.saveKeymap();
			setKeymapError(null);
		} catch (err) {
			setKeymapError(err);
		}
	}, [keymap]);

	return [keymap, keymapError, setKeymapWrapper, setAccelerator];
};

export default useKeymap;
