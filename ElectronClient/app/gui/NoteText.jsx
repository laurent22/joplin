const React = require('react');
const { Note } = require('lib/models/note.js');
const { connect } = require('react-redux');
const { _ } = require('lib/locale.js');
const { reg } = require('lib/registry.js');
const MdToHtml = require('lib/MdToHtml');
const shared = require('lib/components/shared/note-screen-shared.js');
const { bridge } = require('electron').remote.require('./bridge');
const { themeStyle } = require('../theme.js');

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
			scrollHeight: null,
		};

		this.lastLoadedNoteId_ = null;

		this.webviewListeners_ = null;
		this.ignoreNextEditorScroll_ = false;
		this.scheduleSaveTimeout_ = null;
	}

	mdToHtml() {
		if (this.mdToHtml_) return this.mdToHtml_;
		this.mdToHtml_ = new MdToHtml();
		return this.mdToHtml_;
	}

	async componentWillMount() {
		await shared.initState(this);
	}

	componentWillUnmount() {
		this.saveIfNeeded();

		this.mdToHtml_ = null;
		this.destroyWebview();
	}

	async saveIfNeeded() {
		if (this.scheduleSaveTimeout_) clearTimeout(this.scheduleSaveTimeout_);
		this.scheduleSaveTimeout_ = null;
		if (!shared.isModified(this)) return;
		await shared.saveNoteButton_press(this);
	}

	async saveOneProperty(name, value) {
		await shared.saveOneProperty(this, name, value);
	}

	scheduleSave() {
		if (this.scheduleSaveTimeout_) clearTimeout(this.scheduleSaveTimeout_);
		this.scheduleSaveTimeout_ = setTimeout(() => {
			this.saveIfNeeded();
		}, 500);
	}

	async componentWillReceiveProps(nextProps) {
		if ('noteId' in nextProps && nextProps.noteId !== this.props.noteId) {
			this.mdToHtml_ = null;

			const noteId = nextProps.noteId;
			this.lastLoadedNoteId_ = noteId;
			const note = noteId ? await Note.load(noteId) : null;
			if (noteId !== this.lastLoadedNoteId_) return; // Race condition - current note was changed while this one was loading

			this.setState({
				note: note,
				lastSavedNote: Object.assign({}, note),
				mode: 'view',
			});
		}
	}

	isModified() {
		return shared.isModified(this);
	}

	refreshNoteMetadata(force = null) {
		return shared.refreshNoteMetadata(this, force);
	}

	title_changeText(text) {
		shared.noteComponent_change(this, 'title', text);
		this.scheduleSave();
	}

	editor_change(event) {
		shared.noteComponent_change(this, 'body', event.target.value);
		this.scheduleSave();
	}

	toggleIsTodo_onPress() {
		shared.toggleIsTodo_onPress(this);
		this.scheduleSave();
	}

	showMetadata_onPress() {
		shared.showMetadata_onPress(this);
	}

	webview_ipcMessage(event) {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;
		const arg1 = args && args.length >= 2 ? args[1] : null;

		reg.logger().info('Got ipc-message: ' + msg, args);

		if (msg.indexOf('checkboxclick:') === 0) {
			const newBody = this.mdToHtml_.handleCheckboxClick(msg, this.state.note.body);
			this.saveOneProperty('body', newBody);
		} else if (msg.toLowerCase().indexOf('http') === 0) {
			require('electron').shell.openExternal(msg);
		} else if (msg === 'editNote') {
			const lineIndex = arg0 && arg0.length ? arg0[0] : 0;
			this.webview_ref(null);
			this.setState({ 
				mode: 'edit',
				webviewReady: false,
			});
		} else if (msg === 'percentScroll') {
			this.ignoreNextEditorScroll_ = true;
			this.setEditorPercentScroll(arg0);
		} else {
			bridge().showMessageBox({
				type: 'error',
				message: _('Unsupported link or message: %s', msg),
			});
		}
	}

	editorMaxScroll() {
		return Math.max(0, this.editor_.scrollHeight - this.editor_.clientHeight);
	}

	setEditorPercentScroll(p) {
		this.editor_.scrollTop = p * this.editorMaxScroll();
	}

	setViewerPercentScroll(p) {
		this.webview_.send('setPercentScroll', p);
	}

	editor_scroll() {
		if (this.ignoreNextEditorScroll_) {
			this.ignoreNextEditorScroll_ = false;
			return;
		}
		const m = this.editorMaxScroll();
		this.setViewerPercentScroll(m ? this.editor_.scrollTop / m : 0);
	}

	webview_domReady() {
		if (!this.webview_) return;

		this.setState({
			webviewReady: true,
		});

		//this.webview_.openDevTools(); 
	}

	webview_ref(element) {
		if (this.webview_) {
			if (this.webview_ === element) return;
			this.destroyWebview();
		}

		if (!element) {
			this.destroyWebview();
		} else {
			this.initWebview(element);
		}
	}

	editor_ref(element) {
		if (this.editor_ === element) return;
		this.editor_ = element;
	}

	initWebview(wv) {
		if (!this.webviewListeners_) {
			this.webviewListeners_ = {
				'dom-ready': this.webview_domReady.bind(this),
				'ipc-message': this.webview_ipcMessage.bind(this),
			};
		}

		for (let n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			wv.addEventListener(n, fn);
		}

		this.webview_ = wv;
	}

	destroyWebview() {
		if (!this.webview_) return;

		for (let n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			this.webview_.removeEventListener(n, fn);
		}

		this.webview_ = null;
	}

	render() {
		const style = this.props.style;
		const note = this.state.note;
		const body = note ? note.body : '';
		const theme = themeStyle(this.props.theme);

		const viewerStyle = {
			width: Math.floor(style.width / 2),
			height: style.height,
			overflow: 'hidden',
			float: 'left',
			verticalAlign: 'top',
		};

		const paddingTop = 14;

		const editorStyle = {
			width: style.width - viewerStyle.width,
			height: style.height - paddingTop,
			overflowY: 'scroll',
			float: 'left',
			verticalAlign: 'top',
			paddingTop: paddingTop + 'px',
			lineHeight: theme.textAreaLineHeight + 'px',
			fontSize: theme.fontSize + 'px',
		};

		if (this.state.webviewReady) {
			const mdOptions = {
				onResourceLoaded: () => {
					this.forceUpdate();
				},
				postMessageSyntax: 'ipcRenderer.sendToHost',
			};
			const html = this.mdToHtml().render(body, theme, mdOptions);
			this.webview_.send('setHtml', html);
		}

		const viewer = <webview style={viewerStyle} nodeintegration="1" src="note-content.html" ref={(elem) => { this.webview_ref(elem); } } />
		const editor = <textarea style={editorStyle} value={body} onScroll={() => { this.editor_scroll(); }} onChange={(event) => { this.editor_change(event) }} ref={(elem) => { this.editor_ref(elem); } }></textarea>

		return (
			<div style={style}>
				{ editor }
				{ viewer }
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		noteId: state.selectedNoteId,
		folderId: state.selectedFolderId,
		itemType: state.selectedItemType,
		folders: state.folders,
		theme: state.settings.theme,
		showAdvancedOptions: state.settings.showAdvancedOptions,
	};
};

const NoteText = connect(mapStateToProps)(NoteTextComponent);

module.exports = { NoteText };