const React = require('react');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Countable = require('countable');

class NoteContentPropertiesDialog extends React.Component {
	constructor() {
		super();

		this.buttonRow_click = this.buttonRow_click.bind(this);
		this.okButton = React.createRef();

		this.state = {
			textProperties: null,
		};

		this.keyToLabel_ = {
			paragraphs: _('Paragraphs'),
			words: _('Words'),
			characters: _('Characters'),
			characters_no_space: _('Characters excluding spaces'),
		};
	}

	buttonRow_click() {
		this.closeDialog();
	}

	componentDidMount() {
		this.setTextProperties();
	}

	styles(themeId) {
		const styleKey = themeId;
		if (styleKey === this.styleKey_) return this.styles_;

		const theme = themeStyle(themeId);

		this.styles_ = {};
		this.styleKey_ = styleKey;

		this.styles_.controlBox = {
			marginBottom: '1em',
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
		};

		this.styles_.button = {
			minWidth: theme.buttonMinWidth,
			minHeight: theme.buttonMinHeight,
			marginLeft: 5,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		return this.styles_;
	}

	closeDialog() {
		this.props.onClose();
	}

	formatLabel(key) {
		if (this.keyToLabel_[key]) return this.keyToLabel_[key];
		return key;
	}

	setTextProperties() {
		const textProperties = this.createTextPropertiesObject();
		this.setState({ textProperties: textProperties });
	}

	createTextPropertiesObject() {
		const textProperties = {};
		Countable.count(this.props.text, counter => {
			textProperties.paragraphs = counter.paragraphs;
			textProperties.words = counter.words;
			textProperties.characters = counter.all;
			textProperties.characters_no_space = counter.characters;
		})
		return textProperties;
	}

	createItemField(key, value) {
		this.styles(this.props.theme);
		const theme = themeStyle(this.props.theme);
		const labelComp = <label style={Object.assign({}, theme.textStyle, { marginRight: '1em', width: '10em', display: 'inline-block', fontWeight: 'bold' })}>{this.formatLabel(key)}</label>;
		const controlComp = <div style={Object.assign({}, theme.textStyle, { display: 'inline-block' })}>{value}</div>;

		return (
			<div key={key} style={this.styles_.controlBox} className="note-text-property-box">
				{labelComp}
				{controlComp}
			</div>
		);
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const textProperties = this.state.textProperties;

		const textComps = [];

		if (textProperties) {
			for (let key in textProperties) {
				if (!textProperties.hasOwnProperty(key)) continue;
				const comp = this.createItemField(key, textProperties[key]);
				textComps.push(comp);
			}
		}

		return (
			<div style={theme.dialogModalLayer}>
				<div style={theme.dialogBox}>
					<div style={theme.dialogTitle}>{_('Content properties')}</div>
					<div>{textComps}</div>
					<DialogButtonRow theme={this.props.theme} okButtonRef={this.okButton} onClick={this.buttonRow_click}/>
				</div>
			</div>
		);
	}
}

module.exports = NoteContentPropertiesDialog;
