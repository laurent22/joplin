'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_1 = require('react');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Countable = require('countable');
function NoteContentPropertiesDialog(props) {
	const theme = themeStyle(props.theme);
	const textComps = [];
	const [lines, setLines] = react_1.useState(0);
	const [words, setWords] = react_1.useState(0);
	const [characters, setCharacters] = react_1.useState(0);
	const [charactersNoSpace, setCharactersNoSpace] = react_1.useState(0);
	react_1.useEffect(() => {
		Countable.count(props.text, (counter) => {
			setWords(counter.words);
			setCharacters(counter.all);
			setCharactersNoSpace(counter.characters);
		});
		props.text === '' ? setLines(0) : setLines(props.text.split('\n').length);
	}, [props.text]);
	const textProperties = {
		lines: lines,
		words: words,
		characters: characters,
		charactersNoSpace: charactersNoSpace,
	};
	const keyToLabel = {
		words: _('Words'),
		characters: _('Characters'),
		charactersNoSpace: _('Characters excluding spaces'),
		lines: _('Lines'),
	};
	const buttonRow_click = () => {
		props.onClose();
	};
	const createItemField = (key, value) => {
		const labelComp = React.createElement('label', { style: Object.assign({}, theme.textStyle, theme.controlBoxLabel) }, keyToLabel[key]);
		const controlComp = React.createElement('div', { style: Object.assign({}, theme.textStyle, theme.controlBoxValue) }, value);
		return (React.createElement('div', { key: key, style: theme.controlBox, className: 'note-text-property-box' },
			labelComp,
			controlComp));
	};
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
			React.createElement(DialogButtonRow, { theme: props.theme, onClick: buttonRow_click, okButtonShow: false, cancelButtonLabel: _('Close') }))));
}
exports.default = NoteContentPropertiesDialog;
