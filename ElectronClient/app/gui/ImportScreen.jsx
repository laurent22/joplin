const React = require('react');
const { connect } = require('react-redux');
const Folder = require('lib/models/Folder.js');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { filename, basename } = require('lib/path-utils.js');
const { importEnex } = require('lib/import-enex');

class ImportScreenComponent extends React.Component {
	UNSAFE_componentWillMount() {
		this.setState({
			doImport: true,
			filePath: this.props.filePath,
			messages: [],
		});
	}

	UNSAFE_componentWillReceiveProps(newProps) {
		if (newProps.filePath) {
			this.setState(
				{
					doImport: true,
					filePath: newProps.filePath,
					messages: [],
				},
				() => {
					this.doImport();
				}
			);
		}
	}

	componentDidMount() {
		if (this.state.filePath && this.state.doImport) {
			this.doImport();
		}
	}

	addMessage(key, text) {
		const messages = this.state.messages.slice();

		messages.push({ key: key, text: text });

		this.setState({ messages: messages });
	}

	uniqueMessages() {
		let output = [];
		const messages = this.state.messages.slice();
		let foundKeys = [];
		for (let i = messages.length - 1; i >= 0; i--) {
			const msg = messages[i];
			if (foundKeys.indexOf(msg.key) >= 0) continue;
			foundKeys.push(msg.key);
			output.unshift(msg);
		}
		return output;
	}

	async doImport() {
		const filePath = this.props.filePath;
		const folderTitle = await Folder.findUniqueItemTitle(filename(filePath));

		this.addMessage('start', _('New notebook "%s" will be created and file "%s" will be imported into it', folderTitle, basename(filePath)));

		let lastProgress = '';

		const options = {
			onProgress: progressState => {
				let line = [];
				line.push(_('Found: %d.', progressState.loaded));
				line.push(_('Created: %d.', progressState.created));
				if (progressState.updated) line.push(_('Updated: %d.', progressState.updated));
				if (progressState.skipped) line.push(_('Skipped: %d.', progressState.skipped));
				if (progressState.resourcesCreated) line.push(_('Resources: %d.', progressState.resourcesCreated));
				if (progressState.notesTagged) line.push(_('Tagged: %d.', progressState.notesTagged));
				lastProgress = line.join(' ');
				this.addMessage('progress', lastProgress);
			},
			onError: error => {
				// Don't display the error directly because most of the time it doesn't matter
				// (eg. for weird broken HTML, but the note is still imported)
				console.warn('When importing ENEX file', error);
			},
		};

		const folder = await Folder.save({ title: folderTitle });

		await importEnex(folder.id, filePath, options);

		this.addMessage('done', _('The notes have been imported: %s', lastProgress));
		this.setState({ doImport: false });
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.props.style;
		const messages = this.uniqueMessages();

		const messagesStyle = {
			padding: 10,
			fontSize: theme.fontSize,
			fontFamily: theme.fontFamily,
			backgroundColor: theme.backgroundColor,
		};

		const headerStyle = {
			width: style.width,
		};

		const messageComps = [];
		for (let i = 0; i < messages.length; i++) {
			messageComps.push(<div key={messages[i].key}>{messages[i].text}</div>);
		}

		return (
			<div style={{}}>
				<Header style={headerStyle} />
				<div style={messagesStyle}>{messageComps}</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
	};
};

const ImportScreen = connect(mapStateToProps)(ImportScreenComponent);

module.exports = { ImportScreen };
