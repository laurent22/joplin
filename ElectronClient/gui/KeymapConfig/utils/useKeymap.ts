import { useState, useEffect } from 'react';
import KeymapService, { KeymapItem } from '../../../lib/services/KeymapService';

const useKeymap = (keymapService: KeymapService): [KeymapItem[], (commandName: string, accelerator: string) => void, string] => {
	const [keymap, setKeymap] = useState<KeymapItem[]>(() => keymapService.getKeymap());
	const [errorMessage, setErrorMessage] = useState<string>('');

	const setCommandAccelerator = (commandName: string, accelerator: string) => {
		setKeymap(prevKeymap => {
			const newKeymap = [...prevKeymap];

			newKeymap.find(item => item.command === commandName).accelerator = accelerator;
			return newKeymap;
		});
	};

	useEffect(() => {
		try {
			// Synchronize the keymap of KeymapService with the current keymap state
			keymapService.setKeymap(keymap);
			// Save changes to the disk
			keymapService.saveKeymap();

			setErrorMessage('');
		} catch (err) {
			const message = err.message || '';
			setErrorMessage(message);
		}
	}, [keymap]);

	return [keymap, setCommandAccelerator, errorMessage];
};

export default useKeymap;
