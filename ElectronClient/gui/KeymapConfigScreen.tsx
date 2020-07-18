import * as React from 'react';
const { themeStyle } = require('lib/theme');
const { _ } = require('lib/locale.js');
const { shim } = require('lib/shim');
// const { bridge } = require('electron').remote.require('./bridge');
// const Setting = require('lib/models/Setting');

const KeymapConfigScreen = (props: { theme: Object }) => {
	const [accelerator, setAccelerator] = React.useState('Ctrl+X');
	const [filter, setFilter] = React.useState('');

	const theme = themeStyle(props.theme);
	const containerStyle = {
		...theme.containerStyle,
		padding: 10,
		overflow: 'auto',
	};

	const handleKeydown = (
		e: React.KeyboardEvent<HTMLDivElement>
	) => {
		e.preventDefault();
		setAccelerator(DOMtoElectronAccelerator(e));
	};

	return (
		<div style={containerStyle}>
			<TopActions theme={props.theme} filter={filter} setFilter={setFilter}></TopActions>
			<KeymapTable theme={props.theme} />

			<div style={{ padding: theme.margin }}>
				<ShortcutRecorder handleKeydown={handleKeydown} accelerator={accelerator} theme={props.theme} />
			</div>
		</div>
	);
};

const TopActions = (props: {
	theme: any,
	filter: string,
	setFilter: Function
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
				onChange={e => { props.setFilter(e.target.value); }}
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
	theme: any
}) => {
	const theme = themeStyle(props.theme);
	const tableStyle = {
		...theme.containerStyle,
		marginTop: 10,
		overflow: 'auto',
		width: '100%',
	};

	return (
		<table style={tableStyle}>
			<thead>
				<tr>
					<th style={theme.textStyle}>{_('Command')}</th>
					<th style={theme.textStyle}>{_('Shortcut')}</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td style={theme.textStyle}>{_('New note')}</td>
					<td style={theme.textStyle}>{_('Ctrl+N')}</td>
				</tr>
				<tr>
					<td style={theme.textStyle}>{_('New todo')}</td>
					<td style={theme.textStyle}>{_('Ctrl+T')}</td>
				</tr>
			</tbody>
		</table>
	);
};

const ShortcutRecorder = (props: {
	handleKeydown: (e: React.KeyboardEvent<HTMLDivElement>) => void,
	accelerator: string,
	theme: any,
}) => {
	const theme = themeStyle(props.theme);
	const inlineButtonStyle = {
		...theme.buttonStyle,
		height: theme.inputStyle.height,
		padding: 0,
		marginLeft: 12,
	};

	return (
		<div>
			<input
				style={theme.inputStyle}
				placeholder={_('Press the shortcut and hit Enter')}
				onKeyDown={props.handleKeydown}
				value={props.accelerator}
				readOnly
			/>

			<button style={inlineButtonStyle} onClick={() => console.log()}>
				{_('Default')}
			</button>
		</div>
	);
};

const DOMtoElectronAccelerator = (e: React.KeyboardEvent<HTMLDivElement>) => {
	const { key, ctrlKey, metaKey, altKey, shiftKey } = e;
	const modifiersPresent = ctrlKey || metaKey || altKey || shiftKey;

	const parts = [];
	if (modifiersPresent) {
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
	} else if (key === 'Enter') {
		alert('Save');
	} else if (key === 'Escape') {
		alert('Discard');
	} else {
		// Finally, the key
		const _key = DOMtoElectronKey(key);
		if (_key) parts.push(_key);
	}
	return parts.join('+');
};

const DOMtoElectronKey = (key: string) => {
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

export { KeymapConfigScreen, DOMtoElectronAccelerator, DOMtoElectronKey };
