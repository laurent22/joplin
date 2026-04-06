import * as React from 'react';
import { useState, useCallback } from 'react';
import { ShortcutRecorder } from '../../KeymapConfig/ShortcutRecorder';
import { _ } from '@joplin/lib/locale';

interface OnChangeEvent {
	value: string;
}

interface Props {
	value: string;
	themeId: number;
	onChange: (event: OnChangeEvent)=> void;
}

// A thin wrapper around ShortcutRecorder for the global hotkey setting.
// Toggles between a display view and the existing ShortcutRecorder component.
export default function GlobalHotkeyInput(props: Props) {
	const [editing, setEditing] = useState(false);
	const value = props.value || '';

	const onSave = useCallback((event: { commandName: string; accelerator: string }) => {
		// Normalize platform-specific modifiers to CommandOrControl for
		// consistent cross-platform storage.
		const accelerator = event.accelerator
			.replace(/\bCmd\b/, 'CommandOrControl')
			.replace(/\bCtrl\b/, 'CommandOrControl');
		props.onChange({ value: accelerator });
		setEditing(false);
	}, [props.onChange]);

	const onCancel = useCallback(() => {
		setEditing(false);
	}, []);

	const onReset = useCallback(() => {
		props.onChange({ value: '' });
		setEditing(false);
	}, [props.onChange]);

	// Validation errors aren't critical for global shortcuts — log only.
	const onError = useCallback((_event: { recorderError: Error }) => {
		// No-op: ShortcutRecorder validates against the keymap (command
		// conflicts), which doesn't apply to global hotkeys.
	}, []);

	if (editing) {
		return (
			<ShortcutRecorder
				onSave={onSave}
				onReset={onReset}
				onCancel={onCancel}
				onError={onError}
				initialAccelerator={value}
				commandName="globalHotkey"
				themeId={props.themeId}
			/>
		);
	}

	return (
		<div className="global-hotkey-input">
			<span className="shortcut-display">
				{value || _('Not set')}
			</span>
			<button
				className="record-btn"
				onClick={() => setEditing(true)}
				type="button"
			>
				{_('Change')}
			</button>
			{value && (
				<button
					className="clear-btn"
					onClick={() => props.onChange({ value: '' })}
					type="button"
				>
					{_('Clear')}
				</button>
			)}
		</div>
	);
}
