'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const { _ } = require('lib/locale.js');
const { themeStyle, buildStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Countable = require('countable');
function NoteContentPropertiesDialog(props) {
	const okButton = React.createRef();
	const styles = buildStyle('NoteContentPropertiesDialog', props.theme, (theme) => {
		return {
			controlBox: {
				marginBottom: '1em',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
			},
			button: {
				minWidth: theme.buttonMinWidth,
				minHeight: theme.buttonMinHeight,
				marginLeft: 5,
				color: theme.color,
				backgroundColor: theme.backgroundColor,
				border: '1px solid',
				borderColor: theme.dividerColor,
			},
		};
	});
	const theme = themeStyle(props.theme);
	const textProperties = React.useState({});
	const createItemField = (key, value) => {
		const labelComp = React.createElement('label', { style: Object.assign({}, theme.textStyle, { marginRight: '1em', width: '10em', display: 'inline-block', fontWeight: 'bold' }) }, _(key));
		const controlComp = React.createElement('div', { style: Object.assign({}, theme.textStyle, { display: 'inline-block' }) }, value);
		return (React.createElement('div', { key: key, style: styles.controlBox, className: 'note-text-property-box' },
			labelComp,
			controlComp));
	};
	Countable.count(props.text, (counter) => {
		textProperties.words = counter.words;
		textProperties.characters = counter.all;
		textProperties.characters_no_space = counter.characters;
	});
	const textComps = [];
	if (textProperties) {
		for (let key in textProperties) {
			if (!textProperties.hasOwnProperty(key))
				continue;
			const comp = createItemField(key, textProperties[key]);
			textComps.push(comp);
		}
	}
	return (React.createElement('div', { style: theme.dialogModalLayer },
		React.createElement('div', { style: theme.dialogBox },
			React.createElement('div', { style: theme.dialogTitle }, _('Content properties')),
			React.createElement('div', null, textComps),
			React.createElement(DialogButtonRow, { theme: props.theme, okButtonRef: okButton, onClick: props.onClose() }))));
}
exports.default = NoteContentPropertiesDialog;
// # sourceMappingURL=NoteContentPropertiesDialog.js.map
