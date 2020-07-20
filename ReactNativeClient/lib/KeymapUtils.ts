const { shim } = require('lib/shim');

export const DOMtoElectronAccelerator = (e: React.KeyboardEvent<HTMLDivElement>) => {
	const parts = [];
	const { key, ctrlKey, metaKey, altKey, shiftKey } = e;

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
	const _key = DOMtoElectronKey(key);
	if (_key) parts.push(_key);

	return parts.join('+');
};

export const DOMtoElectronKey = (key: string) => {
	if (/^([A-Z0-9]|F1*[1-9]|F10|F2[0-4]|[`~!@#$%^&*()\-_=[\]\\{}|;':",./<>?]|Enter|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Escape|MediaStop|MediaPlayPause|PrintScreen])$/.test(key)) return key;
	if (/^([a-z])$/.test(key)) return key.toUpperCase();
	if (/^Arrow(Up|Down|Left|Right)|Audio(VolumeUp|VolumeDown|VolumeMute)$/.test(key)) return key.slice(5);

	switch (key) {
	case ' ':
		return 'Space';
	case '+':
		return 'Plus';
	case 'MediaTrackNext':
		return 'MediaNextTrack';
	case 'MediaTrackPrevious':
		return 'MediaPreviousTrack';
	}

	console.warn(`Ignoring ${key}`);
	return null;
};
