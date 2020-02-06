import * as React from 'react';
import { useState } from 'react';
const { _ } = require('lib/locale.js');
const { themeStyle, buildStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Countable = require('countable');

interface NoteContentPropertiesDialogProps {
	theme: number,
	text: string,
	onClose: Function,
}

interface TextPropertiesMap {
	[key: string]: Number;
}

interface KeyToLabelMap {
	[key: string]: String;
}

export default function NoteContentPropertiesDialog(props:NoteContentPropertiesDialogProps) {
	const styles = buildStyle('NoteContentPropertiesDialog', props.theme, (theme:any) => {
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

	const keyToLabel: KeyToLabelMap = {
		words: _('Words'),
		characters: _('Characters'),
		characters_no_space: _('Characters excluding spaces'),
	};

	const buttonRow_click = () => {
		props.onClose();
	};

	const theme = themeStyle(props.theme);
	const [textProperties] = useState<TextPropertiesMap>({});

	const createItemField = (key: any, value: any) => {
		const labelComp = <label style={Object.assign({}, theme.textStyle, { marginRight: '1em', width: '10em', display: 'inline-block', fontWeight: 'bold' })}>{keyToLabel[key]}</label>;
		const controlComp = <div style={Object.assign({}, theme.textStyle, { display: 'inline-block' })}>{value}</div>;

		return (
			<div key={key} style={styles.controlBox} className="note-text-property-box">{labelComp}{controlComp}</div>
		);
	};

	const renderTextComponents = () => {
		setTextComps(textProperties);
		const textComps = [];
		if (textProperties) {
			for (let key in textProperties) {
				if (!textProperties.hasOwnProperty(key)) continue;
				const comp = createItemField(key, textProperties[key]);
				textComps.push(comp);
			}
		}
		return textComps;
	};

	const setTextComps = (textProperties: TextPropertiesMap) => {
		Countable.count(props.text, (counter: { words: Number; all: Number; characters: Number; }) => {
			textProperties.words = counter.words;
			textProperties.characters = counter.all;
			textProperties.characters_no_space = counter.characters;
		});
	};

	return (
		<div style={theme.dialogModalLayer}>
			<div style={theme.dialogBox}>
				<div style={theme.dialogTitle}>{_('Content properties')}</div>
				<div>{renderTextComponents()}</div>
				<DialogButtonRow theme={theme} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		</div>
	);
}
