import * as React from 'react';
import { useState, useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import KeymapService from '@joplin/lib/services/KeymapService';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import { blur, focus } from '@joplin/lib/utils/focusHandler';

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

	// Reject pure modifier keys – they produce accelerators like "Shift",
	// "Ctrl", etc. which are not valid global shortcuts on their own.
	const modifierOnly = /^(Shift|Ctrl|Alt|Meta|Cmd|Option|Command|CommandOrControl|CmdOrCtrl|Super|Win)$/.test(accelerator);
	if (modifierOnly) return null;

	// Require at least one modifier key so the shortcut doesn't swallow
	// regular typing in other applications.
	const hasModifier = event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
	if (!hasModifier) return null;

	return accelerator;
};

const GlobalHotkeyInput: React.FC<Props> = ({ value, themeId, onChange }) => {
	const theme = themeStyle(themeId);
	const [recording, setRecording] = useState(false);
	const [pendingAccelerator, setPendingAccelerator] = useState<string>('');
	const inputRef = useRef<HTMLInputElement>(null);

	// Fix: autoFocus on a readOnly input doesn't re-trigger when state changes.
	// Imperatively focus the input whenever recording mode is activated.
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
		// Blur before calling onChange so the Preferences panel detects the
		// focus change and correctly marks the form as dirty.
		if (inputRef.current) blur('GlobalHotkeyInput', inputRef.current);
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
		// Allow Tab/Shift-Tab for keyboard navigation without interfering.
		if (event.code === 'Tab' && !event.metaKey && !event.altKey && !event.ctrlKey) {
			return;
		}
		event.preventDefault();

		const key = event.key;

		if (key === 'Escape') {
			cancelRecording();
			return;
		}

		if (key === 'Enter') {
			if (pendingAccelerator) commitSave(pendingAccelerator);
			return;
		}

		if (key === 'Backspace' || key === 'Delete') {
			setPendingAccelerator('');
			return;
		}

		const accelerator = toGlobalAccelerator(event);
		if (accelerator) setPendingAccelerator(accelerator);
	}, [pendingAccelerator, commitSave, cancelRecording]);

	// ── Styles ────────────────────────────────────────────────────────────
	const inputStyle: React.CSSProperties = {
		fontFamily: theme.fontFamily,
		fontSize: theme.fontSize,
		color: theme.color,
		// Fix: use only guaranteed theme properties to avoid black fallback
		// when optional theme colours (selectedColor2, backgroundColorHover3) are absent.
		backgroundColor: theme.backgroundColor,
		border: `2px solid ${recording ? theme.color4 ?? theme.borderColor4 : theme.borderColor4}`,
		borderRadius: 4,
		padding: '5px 10px',
		minWidth: 200,
		cursor: recording ? 'text' : 'default',
		outline: 'none',
		letterSpacing: '0.03em',
	};

	const buttonStyle: React.CSSProperties = {
		marginLeft: 6,
		fontFamily: theme.fontFamily,
		fontSize: theme.fontSize,
		color: theme.color,
		backgroundColor: theme.backgroundColor3 ?? theme.backgroundColor,
		border: `1px solid ${theme.borderColor4}`,
		borderRadius: 4,
		padding: '4px 10px',
		cursor: 'pointer',
	};

	// ── Derived display values ─────────────────────────────────────────────
	const displayValue = recording
		? (pendingAccelerator || _('Press keys…'))
		: (value || _('Not set'));

	const hint = recording
		? _('Press your shortcut, then Enter to save — or Escape to cancel.')
		: '';

	return (
		<div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
			<input
				ref={inputRef}
				readOnly
				aria-live='polite'
				aria-label={recording ? _('Recording shortcut') : _('Global shortcut')}
				aria-description={hint || undefined}
				value={displayValue}
				style={inputStyle}
				onKeyDown={recording ? handleKeyDown : undefined}
				tabIndex={recording ? 0 : -1}
			/>

			{!recording && (
				<button style={buttonStyle} onClick={startRecording}>
					{value ? _('Change') : _('Record shortcut')}
				</button>
			)}

			{recording && (
				<>
					<button
						style={{ ...buttonStyle, opacity: pendingAccelerator ? 1 : 0.4 }}
						disabled={!pendingAccelerator}
						onClick={() => pendingAccelerator && commitSave(pendingAccelerator)}
					>
						{_('Save')}
					</button>
					<button style={buttonStyle} onClick={cancelRecording}>
						{_('Cancel')}
					</button>
				</>
			)}

			{!recording && value && (
				<button style={{ ...buttonStyle, color: theme.colorError ?? theme.color }} onClick={clearShortcut}>
					{_('Clear')}
				</button>
			)}
		</div>
	);
};

export default GlobalHotkeyInput;
