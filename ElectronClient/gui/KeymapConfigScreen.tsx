import * as React from 'react';
const CommandService = require('lib/services/CommandService').default;
const { themeStyle } = require('lib/theme');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale.js');
// const { bridge } = require('electron').remote.require('./bridge');

// Placeholders for current KeymapService members
const KeymapService_keyCodes = /^([0-9A-Z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]']|F1*[1-9]|F10|F2[0-4]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen)$/;
const KeymapService_instance_getAccelerator = (commandName: string) => {
	switch (commandName) {
	case 'textCopy':
		return 'Ctrl+C';
	case 'textCut':
		return 'Ctrl+X';
	case 'textPaste':
		return 'Ctrl+V';
	default:
		throw new Error('Invalid command');
	}
};
const KeymapService_instance_getCommands = () => [
	'textCopy',
	'textCut',
	'textPaste',
];

// To be moved to KeymapService
const KeymapService_domToElectronAccelerator = (event: React.KeyboardEvent<HTMLDivElement>) => {
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

// To be moved to KeymapService
const KeymapService_domToElectronKey = (domKey: string) => {
	let electronKey;

	if (/^([a-z])$/.test(domKey)) electronKey = domKey.toUpperCase();
	if (/^Arrow(Up|Down|Left|Right)|Audio(VolumeUp|VolumeDown|VolumeMute)$/.test(domKey)) electronKey = domKey.slice(5);

	switch (domKey) {
	case ' ':
		electronKey = 'Space';
		break;
	case '+':
		electronKey = 'Plus';
		break;
	case 'MediaTrackNext':
		electronKey =  'MediaNextTrack';
		break;
	case 'MediaTrackPrevious':
		electronKey =  'MediaPreviousTrack';
		break;
	}

	if (KeymapService_keyCodes.test(electronKey)) return electronKey;
	else return null;
};

interface KeymapItem {
	label: string,
	accelerator: string,
	command: string
	isEditing: boolean,
}

const initialKeymap = KeymapService_instance_getCommands().map(commandName => {
	return {
		label: CommandService.instance().label(commandName),
		accelerator: KeymapService_instance_getAccelerator(commandName),
		command: commandName,
		isEditing: false,
	};
});

const KeymapConfigScreen = (props: { theme: Object }) => {
	const [keymap, setKeymap] = React.useState([...initialKeymap]);
	const [filter, setFilter] = React.useState('');

	const theme = themeStyle(props.theme);
	const containerStyle = {
		...theme.containerStyle,
		padding: 10,
		overflow: 'auto',
	};

	const updateAccelerator = (commandName: string, accelerator: string) => {
		const _keymap = [...keymap];

		_keymap.find(item => item.command === commandName).accelerator = accelerator;
		_keymap.find(item => item.command === commandName).isEditing = false;
		setKeymap(_keymap);
	};

	const updateIsEditing = (commandName: string, isEditing: boolean) => {
		const _keymap = [...keymap];

		_keymap.forEach(item => item.isEditing = false);
		_keymap.find(item => item.command === commandName).isEditing = isEditing;
		setKeymap(_keymap);
	};

	return (
		<div style={containerStyle}>
			<TopActions
				theme={props.theme}
				filter={filter}
				setFilter={setFilter}
			/>
			<KeymapTable
				theme={props.theme}
				keymap={keymap}
				updateAccelerator={updateAccelerator}
				updateIsEditing={updateIsEditing}
			/>
		</div>
	);
};

const TopActions = (props: {
	theme: any,
	filter: string,
	setFilter: (filter: string) => void
}) => {
	const theme = themeStyle(props.theme);
	const topActionsStyle = {
		...theme.containerStyle,
		marginTop: 10,
		display: 'flex',
		flexDirection: 'row',
	};
	const inlineButtonStyle = {
		...theme.buttonStyle,
		height: theme.inputStyle.height,
		padding: 0,
		marginLeft: 12,
	};
	const filterInputStyle = {
		...theme.inputStyle,
		flexGrow: 1,
	};

	return (
		<div style={topActionsStyle}>
			<input
				style={filterInputStyle}
				placeholder={_('Search..')}
				value={props.filter}
				onChange={e => props.setFilter(e.target.value)}
			/>

			<button style={inlineButtonStyle} onClick={() => console.log()}>
				{_('Import')}
			</button>
			<button style={inlineButtonStyle} onClick={() => console.log()}>
				{_('Export')}
			</button>
		</div>
	);
};

const KeymapTable = (props: {
	theme: any,
	keymap: KeymapItem[],
	updateAccelerator: (commandName: string, accelerator: string) => void
	updateIsEditing: (commandName: string, isEditing: boolean) => void
}) => {
	const theme = themeStyle(props.theme);
	const tableStyle = {
		...theme.containerStyle,
		marginTop: 10,
		overflow: 'auto',
		width: '100%',
	};

	const tableRows = props.keymap.map(item =>
		<tr key={item.command}>
			<td style={theme.textStyle}>{item.label}</td>
			<td style={theme.textStyle}>
				{
					item.isEditing ?
						<ShortcutRecorder
							updateAccelerator={(accelerator: string) => props.updateAccelerator(item.command, accelerator)}
							theme={props.theme}
						/>
						:
						<div onClick={() => props.updateIsEditing(item.command, true)}>
							{item.accelerator.length ? item.accelerator : _('Disabled')}
						</div>
				}
			</td>
		</tr>
	);

	return (
		<table style={tableStyle}>
			<thead>
				<tr>
					<th style={theme.textStyle}>{_('Command')}</th>
					<th style={theme.textStyle}>{_('Keyboard Shortcut')}</th>
				</tr>
			</thead>
			<tbody>
				{...tableRows}
			</tbody>
		</table>
	);
};

const ShortcutRecorder = (props: {
	updateAccelerator: (accelerator: string) => void,
	theme: any,
}) => {
	const [newAccelerator, setNewAccelerator] = React.useState('');

	const theme = themeStyle(props.theme);
	const inlineButtonStyle = {
		...theme.buttonStyle,
		height: theme.inputStyle.height,
		padding: 0,
		marginLeft: 12,
	};


	const handleKeydown = (
		event: React.KeyboardEvent<HTMLDivElement>
	) => {
		event.preventDefault();

		const _newAccelerator = KeymapService_domToElectronAccelerator(event);
		switch (_newAccelerator) {
		case 'Enter':
			return props.updateAccelerator(newAccelerator);
		case 'Escape':
			return alert('Toggle isEditing');
		default:
			setNewAccelerator(_newAccelerator);
		}
	};

	return (
		<div>
			<input
				style={theme.inputStyle}
				placeholder={_('Press the shortcut and hit Enter')}
				onKeyDown={handleKeydown}
				value={newAccelerator}
				readOnly
				autoFocus
			/>

			<button style={inlineButtonStyle} onClick={() => alert('Restore default shortcut')}>
				{_('Default')}
			</button>
		</div>
	);
};

export = KeymapConfigScreen;
