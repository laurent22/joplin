import * as React from 'react';
import { useState, useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import KeymapService from '@joplin/lib/services/KeymapService';
import { _ } from '@joplin/lib/locale';
import { focus } from '@joplin/lib/utils/focusHandler';

const keymapService = KeymapService.instance();

interface Props {
	value: string;
	themeId: number;
	onChange: (event: { value: string })=> void;
}

// Converts a DOM keyboard event to an Electron accelerator string and
// validates it is usable as a *global* shortcut (must include at least one
// modifier key, since bare keys like "A" would hijack system-wide typing).
const toGlobalAccelerator = (event: KeyboardEvent<HTMLInputElement>): string | null => {
	const accelerator = keymapService.domToElectronAccelerator(event);

	// Reject pure modifier-only keys — not valid global shortcuts on their own.
	const modifierOnly = /^(Shift|Ctrl|Alt|Meta|Cmd|Option|Command|CommandOrControl|CmdOrCtrl|Super|Win)$/.test(accelerator);
	if (modifierOnly) return null;

	// Require at least one modifier so the shortcut doesn't swallow regular typing.
	const hasModifier = event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
	if (!hasModifier) return null;

	return accelerator;
};

const GlobalHotkeyInput: React.FC<Props> = ({ value, onChange }) => {
	const [recording, setRecording] = useState(false);
	const [pendingAccelerator, setPendingAccelerator] = useState<string>('');
	const inputRef = useRef<HTMLInputElement>(null);

	// autoFocus on a readOnly input doesn't re-trigger when state changes —
	// imperatively focus whenever recording mode is activated.
	useEffect(() => {
		if (recording && inputRef.current) {
			focus('GlobalHotkeyInput', inputRef.current);
		}
	}, [recording]);

	const startRecording = useCallback(() => {
		setPendingAccelerator('');
		setRecording(true);
	}, []);

	const commitSave = useCallback((accelerator: string) => {
		setRecording(false);
		setPendingAccelerator('');
		// Call onChange directly — SettingComponent dispatches SETTING_UPDATE_ONE
		// which persists to settings immediately, no outer "Apply" needed.
		onChange({ value: accelerator });
	}, [onChange]);

	const cancelRecording = useCallback(() => {
		setRecording(false);
		setPendingAccelerator('');
	}, []);

	const clearShortcut = useCallback(() => {
		onChange({ value: '' });
		setRecording(false);
	}, [onChange]);

	const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
		// Allow Tab/Shift-Tab for keyboard navigation.
		if (event.code === 'Tab' && !event.metaKey && !event.altKey && !event.ctrlKey) {
			return;
		}
		event.preventDefault();

		const key = event.key;

		if (key === 'Escape') { cancelRecording(); return; }
		if (key === 'Enter') { if (pendingAccelerator) commitSave(pendingAccelerator); return; }
		if (key === 'Backspace' || key === 'Delete') { setPendingAccelerator(''); return; }

		const accelerator = toGlobalAccelerator(event);
		if (accelerator) setPendingAccelerator(accelerator);
	}, [pendingAccelerator, commitSave, cancelRecording]);

	const displayValue = recording
		? (pendingAccelerator || _('Press keys…'))
		: (value || _('Not set'));

	const hint = recording ? _('Press your shortcut, then Enter to save — or Escape to cancel.') : '';

	return (
		<div className='global-hotkey-input'>
			<input
				ref={inputRef}
				className={`input ${recording ? '-recording' : ''}`}
				readOnly
				aria-live='polite'
				aria-label={recording ? _('Recording shortcut') : _('Global shortcut')}
				aria-description={hint || undefined}
				value={displayValue}
				onKeyDown={recording ? handleKeyDown : undefined}
				tabIndex={recording ? 0 : -1}
			/>

			{!recording && (
				<button className='button' onClick={startRecording}>
					{value ? _('Change') : _('Record shortcut')}
				</button>
			)}

			{recording && (
				<>
					<button
						className='button'
						disabled={!pendingAccelerator}
						onClick={() => pendingAccelerator && commitSave(pendingAccelerator)}
					>
						{_('Save')}
					</button>
					<button className='button' onClick={cancelRecording}>
						{_('Cancel')}
					</button>
				</>
			)}

			{!recording && value && (
				<button className='button -danger' onClick={clearShortcut}>
					{_('Clear')}
				</button>
			)}
		</div>
	);
};

export default GlobalHotkeyInput;
