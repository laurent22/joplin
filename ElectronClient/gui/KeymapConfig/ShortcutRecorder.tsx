import * as React from 'react';
import { useState, useEffect, KeyboardEvent } from 'react';

import KeymapService, { KeymapError } from '../../lib/services/KeymapService';
import styles_ from './styles';

const { _ } = require('lib/locale.js');
const keymapService = KeymapService.instance();

export interface ShortcutRecorderProps {
	onSave: (event: { commandName: string, accelerator: string }) => void,
	onReset: (event: { commandName: string }) => void,
	onCancel: (event: { commandName: string }) => void,
	onError: (event: { recorderError: KeymapError }) => void,
	initialAccelerator: string
	commandName: string,
	themeId: number
}

export const ShortcutRecorder = ({ onSave, onReset, onCancel, onError, initialAccelerator, commandName, themeId }: ShortcutRecorderProps) => {
	const styles = styles_(themeId);

	const [accelerator, setAccelerator] = useState(initialAccelerator);
	const [saveAllowed, setSaveAllowed] = useState(true);

	useEffect(() => {
		try {
			keymapService.validateAccelerator(accelerator);
			keymapService.validateKeymap({ accelerator, command: commandName });
			// Discard previous errors
			onError({ recorderError: null });
			setSaveAllowed(true);
		} catch (recorderError) {
			onError({ recorderError });
			setSaveAllowed(false);
		}
	}, [accelerator]);

	const handleKeydown = (event: KeyboardEvent<HTMLDivElement>) => {
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
				onKeyDown={handleKeydown}
				style={styles.recorderInput}
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
