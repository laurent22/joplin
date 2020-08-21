import * as React from 'react';
import { useState, KeyboardEvent } from 'react';

import styles_ from './styles';
import KeymapService from '../../lib/services/KeymapService';
import { KeymapConfigScreenProps } from './KeymapConfigScreen';

const { _ } = require('lib/locale.js');
const keymapService = KeymapService.instance();

export interface ShortcutRecorderProps extends KeymapConfigScreenProps {
	onSave: (commandName: string, accelerator: string) => void,
	onReset: (commandName: string) => void,
	onCancel: (commandName: string) => void,
	commandName: string,
	themeId: number
}

export const ShortcutRecorder = ({ onSave, onReset, onCancel, commandName, themeId }: ShortcutRecorderProps) => {
	const styles = styles_(themeId);
	const [newAccelerator, setNewAccelerator] = useState('');

	const handleSave = () => onSave(commandName, newAccelerator);
	const handleReset = () => onReset(commandName);
	const handleCancel = () => onCancel(commandName);

	const handleKeydown = (event: KeyboardEvent<HTMLDivElement>) => {
		event.preventDefault();
		const newAccelerator = keymapService.domToElectronAccelerator(event);

		switch (newAccelerator) {
		case 'Enter':
			return handleSave();
		case 'Escape':
			return handleCancel();
		default:
			setNewAccelerator(newAccelerator);
		}
	};

	return (
		<div>
			<input
				value={newAccelerator}
				placeholder={_('Press the shortcut')}
				onKeyDown={handleKeydown}
				style={styles.input}
				readOnly
				autoFocus
			/>

			<button style={styles.inlineButton} onClick={handleSave}>
				{_('Save')}
			</button>

			<button style={styles.inlineButton} onClick={handleReset}>
				{_('Reset to Default')}
			</button>
		</div>
	);
};
