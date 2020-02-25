import * as React from 'react';
import { useState, useEffect } from 'react';
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Countable = require('countable');

interface NoteContentPropertiesDialogProps {
	theme: number,
	text: string,
	onClose: Function,
}

interface TextPropertiesMap {
	[key: string]: number;
}

interface KeyToLabelMap {
	[key: string]: string;
}

export default function NoteContentPropertiesDialog(props:NoteContentPropertiesDialogProps) {
	const theme = themeStyle(props.theme);
	const textComps: JSX.Element[] = [];
	const [lines, setLines] = useState<number>(0);
	const [words, setWords] = useState<number>(0);
	const [characters, setCharacters] = useState<number>(0);
	const [charactersNoSpace, setCharactersNoSpace] = useState<number>(0);

	useEffect(() => {
		Countable.count(props.text, (counter: { words: number; all: number; characters: number; }) => {
			setWords(counter.words);
			setCharacters(counter.all);
			setCharactersNoSpace(counter.characters);
		});
		setLines(props.text.split('\n').length);
	}, [props.text]);

	const textProperties: TextPropertiesMap = {
		lines: lines,
		words: words,
		characters: characters,
		charactersNoSpace: charactersNoSpace,
	};

	const keyToLabel: KeyToLabelMap = {
		words: _('Words'),
		characters: _('Characters'),
		charactersNoSpace: _('Characters excluding spaces'),
		lines: _('Lines'),
	};

	const buttonRow_click = () => {
		props.onClose();
	};

	const createItemField = (key: string, value: number) => {
		const labelComp = <label style={Object.assign({}, theme.textStyle, theme.controlBoxLabel)}>{keyToLabel[key]}</label>;
		const controlComp = <div style={Object.assign({}, theme.textStyle, theme.controlBoxValue)}>{value}</div>;

		return (
			<div key={key} style={theme.controlBox} className="note-text-property-box">{labelComp}{controlComp}</div>
		);
	};

	if (textProperties) {
		for (let key in textProperties) {
			if (!textProperties.hasOwnProperty(key)) continue;
			const comp = createItemField(key, textProperties[key]);
			textComps.push(comp);
		}
	}

	return (
		<div style={theme.dialogModalLayer}>
			<div style={theme.dialogBox}>
				<div style={theme.dialogTitle}>{_('Content properties')}</div>
				<div>{textComps}</div>
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		</div>
	);
}
