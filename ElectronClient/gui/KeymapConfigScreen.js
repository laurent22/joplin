'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const { themeStyle } = require('lib/theme');
const { _ } = require('lib/locale.js');
const { shim } = require('lib/shim');
// const { bridge } = require('electron').remote.require('./bridge');
// const Setting = require('lib/models/Setting');
const KeymapConfigScreen = (props) => {
	const [accelerator, setAccelerator] = React.useState('Ctrl+X');
	const [filter, setFilter] = React.useState('');
	const theme = themeStyle(props.theme);
	const containerStyle = Object.assign(Object.assign({}, theme.containerStyle), { padding: 10, overflow: 'auto' });
	const handleKeydown = (e) => {
		e.preventDefault();
		setAccelerator(DOMtoElectronAccelerator(e));
	};
	return (React.createElement('div', { style: containerStyle },
		React.createElement(TopActions, { theme: props.theme, filter: filter, setFilter: setFilter }),
		React.createElement(KeymapTable, { theme: props.theme }),
		React.createElement('div', { style: { padding: theme.margin } },
			React.createElement(ShortcutRecorder, { handleKeydown: handleKeydown, accelerator: accelerator, theme: props.theme }))));
};
exports.KeymapConfigScreen = KeymapConfigScreen;
const TopActions = (props) => {
	const theme = themeStyle(props.theme);
	const topActionsStyle = Object.assign(Object.assign({}, theme.containerStyle), { marginTop: 10, display: 'flex', flexDirection: 'row' });
	const inlineButtonStyle = Object.assign(Object.assign({}, theme.buttonStyle), { height: theme.inputStyle.height, padding: 0, marginLeft: 12 });
	const filterInputStyle = Object.assign(Object.assign({}, theme.inputStyle), { flexGrow: 1 });
	return (React.createElement('div', { style: topActionsStyle },
		React.createElement('input', { style: filterInputStyle, placeholder: _('Search..'), value: props.filter, onChange: e => { props.setFilter(e.target.value); } }),
		React.createElement('button', { style: inlineButtonStyle, onClick: () => console.log() }, _('Import')),
		React.createElement('button', { style: inlineButtonStyle, onClick: () => console.log() }, _('Export'))));
};
const KeymapTable = (props) => {
	const theme = themeStyle(props.theme);
	const tableStyle = Object.assign(Object.assign({}, theme.containerStyle), { marginTop: 10, overflow: 'auto', width: '100%' });
	return (React.createElement('table', { style: tableStyle },
		React.createElement('thead', null,
			React.createElement('tr', null,
				React.createElement('th', { style: theme.textStyle }, _('Command')),
				React.createElement('th', { style: theme.textStyle }, _('Shortcut')))),
		React.createElement('tbody', null,
			React.createElement('tr', null,
				React.createElement('td', { style: theme.textStyle }, _('New note')),
				React.createElement('td', { style: theme.textStyle }, _('Ctrl+N'))),
			React.createElement('tr', null,
				React.createElement('td', { style: theme.textStyle }, _('New todo')),
				React.createElement('td', { style: theme.textStyle }, _('Ctrl+T'))))));
};
const ShortcutRecorder = (props) => {
	const theme = themeStyle(props.theme);
	const inlineButtonStyle = Object.assign(Object.assign({}, theme.buttonStyle), { height: theme.inputStyle.height, padding: 0, marginLeft: 12 });
	return (React.createElement('div', null,
		React.createElement('input', { style: theme.inputStyle, placeholder: _('Press the shortcut and hit Enter'), onKeyDown: props.handleKeydown, value: props.accelerator, readOnly: true }),
		React.createElement('button', { style: inlineButtonStyle, onClick: () => console.log() }, _('Default'))));
};
const DOMtoElectronAccelerator = (e) => {
	const { key, ctrlKey, metaKey, altKey, shiftKey } = e;
	const modifiersPresent = ctrlKey || metaKey || altKey || shiftKey;
	const parts = [];
	if (modifiersPresent) {
		// First, the modifiers
		if (ctrlKey) { parts.push('Ctrl'); }
		if (shim.isMac()) {
			if (altKey) { parts.push('Option'); }
			if (shiftKey) { parts.push('Shift'); }
			if (metaKey) { parts.push('Cmd'); }
		} else {
			if (altKey) { parts.push('Alt'); }
			if (shiftKey) { parts.push('Shift'); }
		}
		// Finally, the key
		const _key = DOMtoElectronKey(key);
		if (_key) { parts.push(_key); }
	} else if (key === 'Enter') {
		alert('Save');
	} else if (key === 'Escape') {
		alert('Discard');
	} else {
		// Finally, the key
		const _key = DOMtoElectronKey(key);
		if (_key) { parts.push(_key); }
	}
	return parts.join('+');
};
exports.DOMtoElectronAccelerator = DOMtoElectronAccelerator;
const DOMtoElectronKey = (key) => {
	if (/^([A-Z0-9]|F1*[1-9]|F10|F2[0-4]|[`~!@#$%^&*()\-_=[\]\\{}|;':",./<>?]|Enter|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Escape|MediaStop|MediaPlayPause|PrintScreen])$/.test(key)) { return key; }
	if (/^([a-z])$/.test(key)) { return key.toUpperCase(); }
	if (/^Arrow(Up|Down|Left|Right)|Audio(VolumeUp|VolumeDown|VolumeMute)$/.test(key)) { return key.slice(5); }
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
exports.DOMtoElectronKey = DOMtoElectronKey;
// # sourceMappingURL=KeymapConfigScreen.js.map
