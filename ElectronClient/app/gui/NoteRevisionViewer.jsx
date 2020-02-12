/* eslint-disable enforce-react-hooks/enforce-react-hooks */

const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const NoteTextViewer = require('./NoteTextViewer.min');
const HelpButton = require('./HelpButton.min');
const BaseModel = require('lib/BaseModel');
const Revision = require('lib/models/Revision');
const urlUtils = require('lib/urlUtils');
const Setting = require('lib/models/Setting');
const RevisionService = require('lib/services/RevisionService');
const shared = require('lib/components/shared/note-screen-shared.js');
const { MarkupToHtml } = require('lib/joplin-renderer');
const { time } = require('lib/time-utils.js');
const ReactTooltip = require('react-tooltip');
const { urlDecode, substrWithEllipsis } = require('lib/string-utils');
const { bridge } = require('electron').remote.require('./bridge');
const markupLanguageUtils = require('lib/markupLanguageUtils');

class NoteRevisionViewerComponent extends React.PureComponent {
	constructor() {
		super();

		this.state = {
			revisions: [],
			currentRevId: '',
			note: null,
			restoring: false,
		};

		this.viewerRef_ = React.createRef();

		this.viewer_domReady = this.viewer_domReady.bind(this);
		this.revisionList_onChange = this.revisionList_onChange.bind(this);
		this.importButton_onClick = this.importButton_onClick.bind(this);
		this.backButton_click = this.backButton_click.bind(this);
		this.webview_ipcMessage = this.webview_ipcMessage.bind(this);
	}

	style() {
		const theme = themeStyle(this.props.theme);

		let style = {
			root: {
				backgroundColor: theme.backgroundColor,
				display: 'flex',
				flex: 1,
				flexDirection: 'column',
			},
			titleInput: Object.assign({}, theme.inputStyle, { flex: 1 }),
			revisionList: Object.assign({}, theme.dropdownList, { marginLeft: 10, flex: 0.5 }),
		};

		return style;
	}

	async viewer_domReady() {
		// this.viewerRef_.current.wrappedInstance.openDevTools();

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, this.props.noteId);

		this.setState(
			{
				revisions: revisions,
				currentRevId: revisions.length ? revisions[revisions.length - 1].id : '',
			},
			() => {
				this.reloadNote();
			}
		);
	}

	async importButton_onClick() {
		if (!this.state.note) return;
		this.setState({ restoring: true });
		await RevisionService.instance().importRevisionNote(this.state.note);
		this.setState({ restoring: false });
		alert(_('The note "%s" has been successfully restored to the notebook "%s".', substrWithEllipsis(this.state.note.title, 0, 32), RevisionService.instance().restoreFolderTitle()));
	}

	backButton_click() {
		if (this.props.onBack) this.props.onBack();
	}

	revisionList_onChange(event) {
		const value = event.target.value;

		if (!value) {
			if (this.props.onBack) this.props.onBack();
		} else {
			this.setState(
				{
					currentRevId: value,
				},
				() => {
					this.reloadNote();
				}
			);
		}
	}

	async reloadNote() {
		let noteBody = '';
		let markupLanguage = MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;
		if (!this.state.revisions.length || !this.state.currentRevId) {
			noteBody = _('This note has no history');
			this.setState({ note: null });
		} else {
			const revIndex = BaseModel.modelIndexById(this.state.revisions, this.state.currentRevId);
			const note = await RevisionService.instance().revisionNote(this.state.revisions, revIndex);
			if (!note) return;
			noteBody = note.body;
			markupLanguage = note.markup_language;
			this.setState({ note: note });
		}

		const theme = themeStyle(this.props.theme);

		const markupToHtml = markupLanguageUtils.newMarkupToHtml({
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
		});

		const result = await markupToHtml.render(markupLanguage, noteBody, theme, {
			codeTheme: theme.codeThemeCss,
			userCss: this.props.customCss ? this.props.customCss : '',
			resources: await shared.attachedResources(noteBody),
			postMessageSyntax: 'ipcProxySendToHost',
		});

		this.viewerRef_.current.wrappedInstance.send('setHtml', result.html, {
			cssFiles: result.cssFiles,
			pluginAssets: result.pluginAssets,
		});
	}

	async webview_ipcMessage(event) {
		// For the revision view, we only suppport a minimal subset of the IPC messages.
		// For example, we don't need interactive checkboxes or sync between viewer and editor view.
		// We try to get most links work though, except for internal (joplin://) links.

		const msg = event.channel ? event.channel : '';
		const args = event.args;

		if (msg !== 'percentScroll') console.info(`Got ipc-message: ${msg}`, args);

		try {
			if (msg.indexOf('joplin://') === 0) {
				throw new Error(_('Unsupported link or message: %s', msg));
			} else if (urlUtils.urlProtocol(msg)) {
				if (msg.indexOf('file://') === 0) {
					require('electron').shell.openExternal(urlDecode(msg));
				} else {
					require('electron').shell.openExternal(msg);
				}
			} else if (msg.indexOf('#') === 0) {
				// This is an internal anchor, which is handled by the WebView so skip this case
			} else {
				console.warn(`Unsupported message in revision view: ${msg}`);
			}
		} catch (error) {
			console.warn(error);
			bridge().showErrorMessageBox(error.message);
		}
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.style();

		const revisionListItems = [];
		const revs = this.state.revisions.slice().reverse();
		for (let i = 0; i < revs.length; i++) {
			const rev = revs[i];
			const stats = Revision.revisionPatchStatsText(rev);

			revisionListItems.push(
				<option key={rev.id} value={rev.id}>
					{`${time.formatMsToLocal(rev.item_updated_time)} (${stats})`}
				</option>
			);
		}

		const restoreButtonTitle = _('Restore');
		const helpMessage = _('Click "%s" to restore the note. It will be copied in the notebook named "%s". The current version of the note will not be replaced or modified.', restoreButtonTitle, RevisionService.instance().restoreFolderTitle());

		const titleInput = (
			<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderBottomStyle: 'solid', borderColor: theme.dividerColor, paddingBottom: 10 }}>
				<button onClick={this.backButton_click} style={Object.assign({}, theme.buttonStyle, { marginRight: 10, height: theme.inputStyle.height })}>
					<i style={theme.buttonIconStyle} className={'fa fa-chevron-left'}></i>{_('Back')}
				</button>
				<input readOnly type="text" style={style.titleInput} value={this.state.note ? this.state.note.title : ''} />
				<select disabled={!this.state.revisions.length} value={this.state.currentRevId} style={style.revisionList} onChange={this.revisionList_onChange}>
					{revisionListItems}
				</select>
				<button disabled={!this.state.revisions.length || this.state.restoring} onClick={this.importButton_onClick} style={Object.assign({}, theme.buttonStyle, { marginLeft: 10, height: theme.inputStyle.height })}>
					{restoreButtonTitle}
				</button>
				<HelpButton tip={helpMessage} id="noteRevisionHelpButton" onClick={this.helpButton_onClick} />
			</div>
		);

		const viewer = <NoteTextViewer viewerStyle={{ display: 'flex', flex: 1, borderLeft: 'none' }} ref={this.viewerRef_} onDomReady={this.viewer_domReady} onIpcMessage={this.webview_ipcMessage} />;

		return (
			<div style={style.root}>
				{titleInput}
				{viewer}
				<ReactTooltip place="bottom" delayShow={300} className="help-tooltip" />
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
	};
};

const NoteRevisionViewer = connect(mapStateToProps)(NoteRevisionViewerComponent);

module.exports = NoteRevisionViewer;
