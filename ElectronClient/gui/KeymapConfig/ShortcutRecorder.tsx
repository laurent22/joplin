import * as React from 'react';
import { useState, KeyboardEvent } from 'react';

import styles_ from './styles';
import KeymapService from '../../lib/services/KeymapService';
import { KeymapConfigScreenProps } from './KeymapConfigScreen';

const { _ } = require('lib/locale.js');
const keymapService = KeymapService.instance();

export interface ShortcutRecorderProps extends KeymapConfigScreenProps {
	setAccelerator: (accelerator: string) => void,
	resetAccelerator: () => void,
	toggleEditing: () => void,
	themeId: number
}

export const ShortcutRecorder = ({ setAccelerator, resetAccelerator, toggleEditing, themeId }: ShortcutRecorderProps) => {
	const styles = styles_(themeId);
	const [newAccelerator, setNewAccelerator] = useState('');

	const handleKeydown = (event: KeyboardEvent<HTMLDivElement>) => {
		event.preventDefault();
		const newAccelerator = keymapService.domToElectronAccelerator(event);

		switch (newAccelerator) {
		case 'Enter':
			return handleSave();
		case 'Escape':
			return handleReset();
		default:
			setNewAccelerator(newAccelerator);
		}
	};

	const handleReset = () => {
		resetAccelerator();
		toggleEditing();
	};

	const handleSave = () => {
		setAccelerator(newAccelerator.length ? newAccelerator : null);
		toggleEditing();
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
