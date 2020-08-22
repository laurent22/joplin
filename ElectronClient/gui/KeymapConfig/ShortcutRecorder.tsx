import * as React from 'react';
import { useState, KeyboardEvent } from 'react';

import styles_ from './styles';
import KeymapService from '../../lib/services/KeymapService';

const { _ } = require('lib/locale.js');
const keymapService = KeymapService.instance();

export interface ShortcutRecorderProps {
	onSave: (commandName: string, accelerator: string) => void,
	onReset: (commandName: string) => void,
	onCancel: (commandName: string) => void,
	commandName: string,
	themeId: number
}

export const ShortcutRecorder = ({ onSave, onReset, onCancel, commandName, themeId }: ShortcutRecorderProps) => {
	const styles = styles_(themeId);
	const [accelerator, setAccelerator] = useState('');

	const handleKeydown = (event: KeyboardEvent<HTMLDivElement>) => {
		event.preventDefault();
		const newAccelerator = keymapService.domToElectronAccelerator(event);

		switch (newAccelerator) {
		case 'Enter':
			return onSave(commandName, newAccelerator);
		case 'Escape':
			return onCancel(commandName);
		default:
			setAccelerator(newAccelerator);
		}
	};

	return (
		<div>
			<input
				value={accelerator}
				placeholder={_('Press the shortcut')}
				onKeyDown={handleKeydown}
				style={styles.input}
				readOnly
				autoFocus
			/>
			<button style={styles.inlineButton} onClick={() => onSave(commandName, accelerator)}>
				{_('Save')}
			</button>
			<button style={styles.inlineButton} onClick={() => onReset(commandName)}>
				{_('Reset to default')}
			</button>
		</div>
	);
};
