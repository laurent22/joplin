import * as React from 'react';
import { useState, useEffect } from 'react';
const { _ } = require('lib/locale.js');
const { themeStyle } = require('lib/theme');
const DialogButtonRow = require('./DialogButtonRow.min');
const Countable = require('countable');
const markupLanguageUtils = require('lib/markupLanguageUtils');

interface NoteContentPropertiesDialogProps {
	theme: number,
	text: string,
	markupLanguage: number,
	onClose: Function,
}

interface TextPropertiesMap {
	[key: string]: number;
}

interface KeyToLabelMap {
	[key: string]: string;
}

let markupToHtml_:any = null;
function markupToHtml() {
	if (markupToHtml_) return markupToHtml_;
	markupToHtml_ = markupLanguageUtils.newMarkupToHtml();
	return markupToHtml_;
}

function countElements(text:string, wordSetter:Function, characterSetter:Function, characterNoSpaceSetter:Function, lineSetter:Function) {
	Countable.count(text, (counter:any) => {
		wordSetter(counter.words);
		characterSetter(counter.all);
		characterNoSpaceSetter(counter.characters);
	});
	text === '' ? lineSetter(0) : lineSetter(text.split('\n').length);
}

function formatReadTime(readTimeMinutes: number) {
	if (readTimeMinutes < 1) {
		return '< 1';
	}

	return Math.ceil(readTimeMinutes).toString();
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
	// This amount based on the following paper:
	// https://www.researchgate.net/publication/332380784_How_many_words_do_we_read_per_minute_A_review_and_meta-analysis_of_reading_rate
	const wordsPerMinute = 250;

	useEffect(() => {
		countElements(props.text, setWords, setCharacters, setCharactersNoSpace, setLines);
	}, [props.text]);

	useEffect(() => {
		const strippedText: string = markupToHtml().stripMarkup(props.markupLanguage, props.text);
		countElements(strippedText, setStrippedWords, setStrippedCharacters, setStrippedCharactersNoSpace, setStrippedLines);
	}, [props.text]);

	useEffect(() => {
		const readTimeMinutes: number = strippedWords / wordsPerMinute;
		setStrippedReadTime(readTimeMinutes);
	}, [strippedWords]);

	const textProperties: TextPropertiesMap = {
		lines: lines,
		words: words,
		characters: characters,
		charactersNoSpace: charactersNoSpace,
	};

	const strippedTextProperties: TextPropertiesMap = {
		// The function stripMarkup() currently removes all new lines so we can't use the
		// strippedLines property. Instead we simply use the lines property which should
		// be a good approximation anyway.
		// Also dummy check to silence TypeScript warning
		lines: strippedLines === -5000 ? strippedLines : lines,
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
					{_('Read time: %s min', formatReadTime(strippedReadTime))}
				</div>
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		</div>
	);
}
