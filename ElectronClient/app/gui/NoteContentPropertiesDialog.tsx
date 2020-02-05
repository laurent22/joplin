const React = require('react');
const { _ } = require('lib/locale.js');
const { themeStyle, buildStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Countable = require('countable');

interface NoteContentPropertiesDialogProps {
	theme: number,
	text: string,
	onClose: Function,
}

export default function NoteContentPropertiesDialog(props:NoteContentPropertiesDialogProps) {
	const okButton = React.createRef();

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

	const theme = themeStyle(props.theme);
	const textProperties = React.useState({});

	const createItemField = (key: any, value: any) => {
		const labelComp = <label style={Object.assign({}, theme.textStyle, { marginRight: '1em', width: '10em', display: 'inline-block', fontWeight: 'bold' })}>{_(key)}</label>;
		const controlComp = <div style={Object.assign({}, theme.textStyle, { display: 'inline-block' })}>{value}</div>;

		return (
			<div key={key} style={styles.controlBox} className="note-text-property-box">
				{labelComp}
				{controlComp}
			</div>
		);
	};

	Countable.count(props.text, (counter: { words: Number; all: Number; characters: Number; }) => {
		textProperties.words = counter.words;
		textProperties.characters = counter.all;
		textProperties.characters_no_space = counter.characters;
	});

	const textComps = [];

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
				<DialogButtonRow theme={props.theme} okButtonRef={okButton} onClick={props.onClose()}/>
			</div>
		</div>
	);
}
