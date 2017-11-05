const React = require('react');
const { Note } = require('lib/models/note.js');
const { connect } = require('react-redux');
const { MdToHtml } = require('lib/markdown-utils.js');
const shared = require('lib/components/shared/note-screen-shared.js');

class NoteTextComponent extends React.Component {

	constructor() {
		super();

		this.state = {
			note: Note.new(),
			mode: 'view',
			noteMetadata: '',
			showNoteMetadata: false,
			folder: null,
			lastSavedNote: null,
			isLoading: true,
			webviewReady: false,
		};
	}

	async componentWillMount() {
		this.mdToHtml_ = new MdToHtml();

		await shared.initState(this);
	}

	componentDidMount() {
		this.webview_.addEventListener('dom-ready', this.webview_domReady.bind(this));
	}

	componentWillUnmount() {
		this.mdToHtml_ = null;
		this.webview_.addEventListener('dom-ready', this.webview_domReady.bind(this));
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.noteId) this.reloadNote(nextProps.noteId);
	}

	isModified() {
		return shared.isModified(this);
	}

	refreshNoteMetadata(force = null) {
		return shared.refreshNoteMetadata(this, force);
	}

	title_changeText(text) {
		shared.noteComponent_change(this, 'title', text);
	}

	body_changeText(text) {
		shared.noteComponent_change(this, 'body', text);
	}

	async saveNoteButton_press() {
		await shared.saveNoteButton_press(this);
	}

	async saveOneProperty(name, value) {
		await shared.saveOneProperty(this, name, value);
	}

	toggleIsTodo_onPress() {
		shared.toggleIsTodo_onPress(this);
	}

	showMetadata_onPress() {
		shared.showMetadata_onPress(this);
	}

	webview_domReady() {
		this.setState({
			webviewReady: true,
		});

		// this.webview_.openDevTools(); 

		this.webview_.addEventListener('ipc-message', (event) => {
			const msg = event.channel;

			if (msg.indexOf('checkboxclick:') === 0) {
				const newBody = this.mdToHtml_.handleCheckboxClick(msg, this.state.note.body);
				this.saveOneProperty('body', newBody);
			}
		})
	}

	async reloadNote(noteId) {
		const note = noteId ? await Note.load(noteId) : null;

		console.info('Reload note: ' + noteId, note);

		this.setState({
			note: note,
		});
	}

	render() {
		const note = this.state.note;
		const body = note ? note.body : 'no note';

		console.info('NOTE: ' + (note ? note.title + ' ' + note.id : 'UNDEFINED'));

		if (this.state.webviewReady) {
			const mdOptions = {
				onResourceLoaded: () => {
					this.forceUpdate();
				},
				postMessageSyntax: 'ipcRenderer.sendToHost',
			};

			const html = this.mdToHtml_.render(note ? note.body : '', {}, mdOptions);

			this.webview_.send('setHtml', html);
		}

		const webviewStyle = {
			width: this.props.style.width,
			height: this.props.style.height,
		};

		return (
			<div style={this.props.style}>
				<webview style={webviewStyle} nodeintegration="1" src="note-content.html" ref={elem => this.webview_ = elem} />
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		noteId: state.selectedNoteId,
		notes: state.notes,
		folderId: state.selectedFolderId,
		itemType: state.selectedItemType,
		folders: state.folders,
		theme: state.settings.theme,
		showAdvancedOptions: state.settings.showAdvancedOptions,
	};
};

const NoteText = connect(mapStateToProps)(NoteTextComponent);

module.exports = { NoteText };