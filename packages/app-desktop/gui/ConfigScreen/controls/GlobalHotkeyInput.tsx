import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { _ } from '@joplin/lib/locale';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	value: unknown;
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Matches settingKeyToControl interface
	onChange: Function;
}

// Map browser key names to Electron accelerator names
const keyToAccelerator = (event: React.KeyboardEvent): string | null => {
	const parts: string[] = [];

	if (event.ctrlKey || event.metaKey) parts.push('CommandOrControl');
	if (event.altKey) parts.push('Alt');
	if (event.shiftKey) parts.push('Shift');

	// Ignore standalone modifier presses
	if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return null;

	// Require at least one modifier to avoid hijacking normal typing
	if (parts.length === 0) return null;

	// Map special key names
	let key = event.key;
	if (key === ' ') key = 'Space';
	else if (key === 'ArrowUp') key = 'Up';
	else if (key === 'ArrowDown') key = 'Down';
	else if (key === 'ArrowLeft') key = 'Left';
	else if (key === 'ArrowRight') key = 'Right';
	else if (key === 'Escape') key = 'Escape';
	else if (key === 'Enter') key = 'Return';
	else if (key === 'Backspace') key = 'Backspace';
	else if (key === 'Delete') key = 'Delete';
	else if (key === 'Tab') key = 'Tab';
	else if (key.length === 1) key = key.toUpperCase();

	parts.push(key);
	return parts.join('+');
};

export default function GlobalHotkeyInput(props: Props) {
	const [recording, setRecording] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const value = (props.value as string) || '';

	// Auto-focus the input when recording starts
	useEffect(() => {
		if (recording && inputRef.current) {
			focus('GlobalHotkeyInput::recording', inputRef.current);
		}
	}, [recording]);

	const onRecordClick = useCallback(() => {
		setRecording(true);
	}, []);

	const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
		if (!recording) return;

		event.preventDefault();
		event.stopPropagation();

		// Allow Escape to cancel recording
		if (event.key === 'Escape') {
			setRecording(false);
			return;
		}

		const accelerator = keyToAccelerator(event);
		if (accelerator) {
			setRecording(false);
			props.onChange({ value: accelerator });
		}
	// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- props.onChange is typed as Function (required by settingKeyToControl interface)
	}, [recording, props.onChange]);

	const onClearClick = useCallback(() => {
		props.onChange({ value: '' });
	// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- props.onChange is typed as Function (required by settingKeyToControl interface)
	}, [props.onChange]);

	const onBlur = useCallback(() => {
		setRecording(false);
	}, []);

	const displayText = recording
		? _('Press a key combination...')
		: (value || _('Not set'));

	return (
		<div className="global-hotkey-input">
			<input
				ref={inputRef}
				className={`shortcut-display${recording ? ' -recording' : ''}`}
				type="text"
				value={recording ? '' : value}
				placeholder={displayText}
				readOnly={!recording}
				onKeyDown={onKeyDown}
				onBlur={onBlur}
			/>
			<button
				className="record-btn"
				onClick={onRecordClick}
				type="button"
			>
				{recording ? _('Recording...') : _('Record shortcut')}
			</button>
			{value && (
				<button
					className="clear-btn"
					onClick={onClearClick}
					type="button"
				>
					{_('Clear')}
				</button>
			)}
		</div>
	);
}
