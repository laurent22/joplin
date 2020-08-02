import * as React from 'react';
import { useState, KeyboardEvent } from 'react';

import styles_ from './styles';
import { KeymapConfigScreenProps } from './KeymapConfigScreen';
const { shim } = require('lib/shim');
const { _ } = require('lib/locale.js');

export interface ShortcutRecorderProps extends KeymapConfigScreenProps {
    updateAccelerator: (accelerator: string) => void,
    updateIsEditing: (isEditing: boolean) => void,
}

export const ShortcutRecorder = (props: ShortcutRecorderProps) => {
	const styles = styles_(props);
	const [accelerator, setAccelerator] = useState('');

	const handleKeydown = (event: KeyboardEvent<HTMLDivElement>) => {
		event.preventDefault();
		const newAccelerator = KeymapService_domToElectronAccelerator(event);

		switch (newAccelerator) {
		case 'Enter':
			props.updateAccelerator(accelerator);
			props.updateIsEditing(false);
			break;
		case 'Escape':
			return props.updateIsEditing(false);
		default:
			setAccelerator(newAccelerator);
		}
	};

	const handleRestore = () => {
		console.warn('handleRestore');

		props.updateIsEditing(false);
	};

	const handleBlur = () => {
		// Use a reference element to ignore blur if still focused on current row
		// Otherwise it wouldn't be possible to click on "Default" button

		// props.updateIsEditing(false);
	};

	const placeholderText = _('Press the shortcut and hit Enter');

	return (
		<div onBlur={handleBlur}>
			<input
				value={accelerator}
				placeholder={placeholderText}
				onKeyDown={handleKeydown}
				readOnly
				autoFocus
				style={styles.inputStyle}
				size={placeholderText.length}
			/>

			<button style={styles.inlineButtonStyle} onClick={handleRestore}>
				{_('Default')}
			</button>
		</div>
	);
};

// Placeholder
const KeymapService_keyCodes = /^([0-9A-Z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]']|F1*[1-9]|F10|F2[0-4]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen)$/;

// Will be moved to KeymapService
const KeymapService_domToElectronAccelerator = (event: KeyboardEvent<HTMLDivElement>) => {
	const parts = [];
	const { key, ctrlKey, metaKey, altKey, shiftKey } = event;

	// First, the modifiers
	if (ctrlKey) parts.push('Ctrl');
	if (shim.isMac()) {
		if (altKey) parts.push('Option');
		if (shiftKey) parts.push('Shift');
		if (metaKey) parts.push('Cmd');
	} else {
		if (altKey) parts.push('Alt');
		if (shiftKey) parts.push('Shift');
	}

	// Finally, the key
	const _key = KeymapService_domToElectronKey(key);
	if (_key) parts.push(_key);

	return parts.join('+');
};

// Will be moved to KeymapService
const KeymapService_domToElectronKey = (domKey: string) => {
	let electronKey;

	if (/^([a-z])$/.test(domKey)) { electronKey = domKey.toUpperCase(); } else if (/^Arrow(Up|Down|Left|Right)|Audio(VolumeUp|VolumeDown|VolumeMute)$/.test(domKey)) { electronKey = domKey.slice(5); } else {
		switch (domKey) {
		case ' ':
			electronKey = 'Space';
			break;
		case '+':
			electronKey = 'Plus';
			break;
		case 'MediaTrackNext':
			electronKey = 'MediaNextTrack';
			break;
		case 'MediaTrackPrevious':
			electronKey = 'MediaPreviousTrack';
			break;
		default:
			electronKey = domKey;
		}
	}

	if (KeymapService_keyCodes.test(electronKey)) return electronKey;
	else return null;
};
