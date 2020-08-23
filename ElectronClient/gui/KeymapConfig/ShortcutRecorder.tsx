import * as React from 'react';
import { useState, KeyboardEvent } from 'react';

import KeymapService from '../../lib/services/KeymapService';
import styles_ from './styles';

const { _ } = require('lib/locale.js');
const keymapService = KeymapService.instance();

export interface ShortcutRecorderProps {
	onSave: (event: { commandName: string, accelerator: string }) => void,
	onReset: (event: { commandName: string }) => void,
	onCancel: (event: { commandName: string }) => void,
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
			return onSave({ commandName, accelerator });
		case 'Escape':
			return onCancel({ commandName });
		default:
			setAccelerator(newAccelerator);
		}
	};

	return (
		<div style={styles.tableCell}>
			<input
				value={accelerator}
				placeholder={_('Press the shortcut')}
				onKeyDown={handleKeydown}
				style={styles.shortcutInput}
				readOnly
				autoFocus
			/>
			<button style={styles.inlineButton} onClick={() => onSave({ commandName, accelerator })}>
				{_('Save')}
			</button>
			<button style={styles.inlineButton} onClick={() => onReset({ commandName })}>
				{_('Reset to default')}
			</button>
			<button style={styles.inlineButton} onClick={() => onCancel({ commandName })}>
				{_('Cancel')}
			</button>
		</div>
	);
};
