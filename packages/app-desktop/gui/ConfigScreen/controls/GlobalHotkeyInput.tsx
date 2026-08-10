import * as React from 'react';
import { useCallback } from 'react';
import { ShortcutRecorder } from '../../KeymapConfig/ShortcutRecorder';

interface OnChangeEvent {
	value: string;
}

interface Props {
	value: string;
	themeId: number;
	onChange: (event: OnChangeEvent)=> void;
}

// A thin wrapper around ShortcutRecorder for the global hotkey setting.
// Reuses ShortcutRecorder directly instead of maintaining a separate display mode.
export default function GlobalHotkeyInput(props: Props) {
	const value = props.value || '';

	const onSave = useCallback((event: { commandName: string; accelerator: string }) => {
		// Normalize platform-specific modifiers to CommandOrControl for
		// consistent cross-platform storage.
		const accelerator = event.accelerator
			.replace(/\bCmd\b/, 'CommandOrControl')
			.replace(/\bCtrl\b/, 'CommandOrControl');
		props.onChange({ value: accelerator });
	}, [props.onChange]);

	const onReset = useCallback(() => {
		props.onChange({ value: '' });
	}, [props.onChange]);

	// No-op: global hotkeys don't have a separate editing mode to cancel out of.
	const onCancel = useCallback(() => {}, []);

	// No-op: ShortcutRecorder validates against the keymap (command
	// conflicts), which doesn't apply to global hotkeys.
	const onError = useCallback((_event: { recorderError: Error }) => {}, []);

	return (
		<ShortcutRecorder
			onSave={onSave}
			onReset={onReset}
			onCancel={onCancel}
			onError={onError}
			initialAccelerator={value}
			commandName="globalHotkey"
			themeId={props.themeId}
			skipKeymapValidation
			autoFocus={false}
		/>
	);
}
