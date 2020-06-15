import * as React from 'react';
import { useState, useEffect } from 'react';
const { _ } = require('lib/locale.js');
const { themeStyle } = require('lib/theme');
const DialogButtonRow = require('./DialogButtonRow.min');
const { stripMarkdown } = require('lib/markdownUtils');
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

function countElements(text:string, wordSetter:Function, characterSetter:Function, characterNoSpaceSetter:Function, lineSetter:Function) {
	Countable.count(text, (counter:any) => {
		wordSetter(counter.words);
		characterSetter(counter.all);
		characterNoSpaceSetter(counter.characters);
	});
	text === '' ? lineSetter(0) : lineSetter(text.split('\n').length);
}

function formatReadTime(read_time: number) {
	if (read_time < 1) {
		return '< 1';
	}

	return Math.ceil(read_time).toString();
}

export default function NoteContentPropertiesDialog(props:NoteContentPropertiesDialogProps) {
	const theme = themeStyle(props.theme);
	const tableBodyComps: JSX.Element[] = [];
	// For the source Markdown
	const [lines, setLines] = useState<number>(0);
	const [words, setWords] = useState<number>(0);
	const [characters, setCharacters] = useState<number>(0);
	const [charactersNoSpace, setCharactersNoSpace] = useState<number>(0);
	// For source with Markdown syntax stripped out
	const [strippedLines, setStrippedLines] = useState<number>(0);
	const [strippedWords, setStrippedWords] = useState<number>(0);
	const [strippedCharacters, setStrippedCharacters] = useState<number>(0);
	const [strippedCharactersNoSpace, setStrippedCharactersNoSpace] = useState<number>(0);
	const [strippedReadTime, setStrippedReadTime] = useState<number>(0);
	const words_per_minute = 200;

	useEffect(() => {
		countElements(props.text, setWords, setCharacters, setCharactersNoSpace, setLines);
	}, [props.text]);

	useEffect(() => {
		const strippedText: string = stripMarkdown(props.text);
		countElements(strippedText, setStrippedWords, setStrippedCharacters, setStrippedCharactersNoSpace, setStrippedLines);
	}, [props.text]);

	useEffect(() => {
		const read_time: number = strippedWords / words_per_minute;
		setStrippedReadTime(read_time);
	}, [strippedWords]);

	const textProperties: TextPropertiesMap = {
		lines: lines,
		words: words,
		characters: characters,
		charactersNoSpace: charactersNoSpace,
	};

	const strippedTextProperties: TextPropertiesMap = {
		lines: strippedLines,
		words: strippedWords,
		characters: strippedCharacters,
		charactersNoSpace: strippedCharactersNoSpace,
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

	const labelCompStyle = {
		...theme.textStyle,
		fontWeight: 'bold',
		width: '10em',
	};

	const controlCompStyle = {
		...theme.textStyle,
		textAlign: 'center',
	};

	const createTableBodyRow = (key: string, value: number, strippedValue: number) => {
		const labelComp = <td style={labelCompStyle}>{keyToLabel[key]}</td>;
		const controlComp = <td style={controlCompStyle}>{value}</td>;
		const strippedControlComp = <td style={controlCompStyle}>{strippedValue}</td>;

		return (
			<tr key={key}>{labelComp}{controlComp}{strippedControlComp}</tr>
		);
	};

	const tableHeaderStyle = {
		...theme.textStyle,
		textAlign: 'center',
	};

	const tableHeader = (
		<tr>
			<th style={tableHeaderStyle}></th>
			<th style={tableHeaderStyle}>{_('Editor')}</th>
			<th style={tableHeaderStyle}>{_('Viewer')}</th>
		</tr>
	);

	for (const key in textProperties) {
		const comp = createTableBodyRow(key, textProperties[key], strippedTextProperties[key]);
		tableBodyComps.push(comp);
	}

	const dialogBoxHeadingStyle = {
		...theme.dialogTitle,
		textAlign: 'center',
	};

	return (
		<div style={theme.dialogModalLayer}>
			<div style={theme.dialogBox}>
				<div style={dialogBoxHeadingStyle}>{_('Statistics')}</div>
				<table>
					<thead>
						{tableHeader}
					</thead>
					<tbody>
						{tableBodyComps}
					</tbody>
				</table>
				<div style={labelCompStyle}>
					{_('Approx. reading time:')} {formatReadTime(strippedReadTime)} {_('min')}
				</div>
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		</div>
	);
}
