import * as React from 'react';
import { useState, useEffect, KeyboardEvent } from 'react';

import KeymapService from '@joplin/lib/services/KeymapService';
import styles_ from './styles';

import { _ } from '@joplin/lib/locale';
const keymapService = KeymapService.instance();

export interface ShortcutRecorderProps {
	onSave: (event: { commandName: string; accelerator: string })=> void;
	onReset: (event: { commandName: string })=> void;
	onCancel: (event: { commandName: string })=> void;
	onError: (event: { recorderError: Error })=> void;
	initialAccelerator: string;
	commandName: string;
	themeId: number;
}

export const ShortcutRecorder = ({ onSave, onReset, onCancel, onError, initialAccelerator, commandName, themeId }: ShortcutRecorderProps) => {
	const styles = styles_(themeId);

	const [accelerator, setAccelerator] = useState(initialAccelerator);
	const [saveAllowed, setSaveAllowed] = useState(true);

	useEffect(() => {
		try {
			// Only perform validations if there's an accelerator provided
			// Otherwise performing a save means that it's going to be disabled
			if (accelerator) {
				keymapService.validateAccelerator(accelerator);
				keymapService.validateKeymap({ accelerator, command: commandName });
			}

			// Discard previous errors
			onError({ recorderError: null });
			setSaveAllowed(true);
		} catch (recorderError) {
			onError({ recorderError });
			setSaveAllowed(false);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [accelerator]);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		event.preventDefault();
		const newAccelerator = keymapService.domToElectronAccelerator(event);

		switch (newAccelerator) {
		case 'Enter':
			if (saveAllowed) return onSave({ commandName, accelerator });
			break;
		case 'Escape':
			return onCancel({ commandName });
		case 'Backspace':
		case 'Delete':
			return setAccelerator('');
		default:
			setAccelerator(newAccelerator);
		}
	};

	return (
		<div style={styles.recorderContainer}>
			<input
				value={accelerator}
				placeholder={_('Press the shortcut')}
				onKeyDown={handleKeyDown}
				style={styles.recorderInput}
				title={_('Press the shortcut and then press ENTER. Or, press BACKSPACE to clear the shortcut.')}
				readOnly
				autoFocus
			/>

			<button style={styles.inlineButton} disabled={!saveAllowed} onClick={() => onSave({ commandName, accelerator })}>
				{_('Save')}
			</button>
			<button style={styles.inlineButton} onClick={() => onReset({ commandName })}>
				{_('Restore')}
			</button>
			<button style={styles.inlineButton} onClick={() => onCancel({ commandName })}>
				{_('Cancel')}
			</button>
		</div>
	);
};
