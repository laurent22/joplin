const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const NoteTextViewer = require('./NoteTextViewer.min');
const HelpButton = require('./HelpButton.min');
const BaseModel = require('lib/BaseModel');
const Revision = require('lib/models/Revision');
const Setting = require('lib/models/Setting');
const RevisionService = require('lib/services/RevisionService');
const shared = require('lib/components/shared/note-screen-shared.js');
const MdToHtml = require('lib/MdToHtml');
const { time } = require('lib/time-utils.js');

class NoteRevisionViewerComponent extends React.PureComponent {

	constructor() {
		super();

		this.state = {
			revisions: [],
			currentRevId: '',
			note: null,
		};

		this.viewerRef_ = React.createRef();

		this.viewer_domReady = this.viewer_domReady.bind(this);
		this.revisionList_onChange = this.revisionList_onChange.bind(this);
		this.importButton_onClick = this.importButton_onClick.bind(this);
		this.helpButton_onClick = this.helpButton_onClick.bind(this);
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
		
		this.setState({
			revisions: revisions,
			currentRevId: revisions.length ? revisions[revisions.length - 1].id : null,
		}, () => {
			this.reloadNote();
		});
	}

	importButton_onClick() {
		if (!this.state.note) return;
		RevisionService.instance().importRevisionNote(this.state.note);
	}

	helpButton_onClick() {
		
	}

	revisionList_onChange(event) {
		const value = event.target.value;

		if (!value) {
			if (this.props.onBack) this.props.onBack();
		} else {
			this.setState({
				currentRevId: value,
			}, () => {
				this.reloadNote();
			});
		}
	}

	async reloadNote() {
		if (!this.state.currentRevId) return;

		const revIndex = BaseModel.modelIndexById(this.state.revisions, this.state.currentRevId);
		const note = await RevisionService.instance().revisionNote(this.state.revisions, revIndex);
		if (!note) return;

		const theme = themeStyle(this.props.theme);

		const mdToHtml = new MdToHtml({
			resourceBaseUrl: 'file://' + Setting.value('resourceDir') + '/',
		});

		const result = mdToHtml.render(note.body, theme, {
			codeTheme: theme.codeThemeCss,
			userCss: this.props.customCss ? this.props.customCss : '',
			resources: await shared.attachedResources(note.body),
		});

		this.viewerRef_.current.wrappedInstance.send('setHtml', result.html,  { cssFiles: result.cssFiles });

		this.setState({ note: note });
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.style();

		const revisionListItems = [<option key="back" value="">{_('Back to current version')}</option>];
		const revs = this.state.revisions.slice().reverse();
		for (let i = 0; i < revs.length; i++) {
			const rev = revs[i];
			revisionListItems.push(<option
				key={rev.id}
				value={rev.id}
			>{time.formatMsToLocal(rev.updated_time)}</option>);
		}

		const titleInput = (
			<div style={{display:'flex', flexDirection: 'row', alignItems:'center', marginBottom: 10, borderWidth: 1, borderBottomStyle: 'solid', borderColor: theme.dividerColor, paddingBottom:10}}>
				<input type="text" style={style.titleInput} value={this.state.note ? this.state.note.title : ''}/>
				<select value={this.state.currentRevId} style={style.revisionList} onChange={this.revisionList_onChange}>
					{revisionListItems}
				</select>
				<button onClick={this.importButton_onClick} style={Object.assign({}, theme.buttonStyle, { marginLeft: 10, height: theme.inputStyle.height })}>{_('Restore')}</button>
				<HelpButton onClick={this.helpButton_onClick}/>
			</div>
		);

		const viewer = <NoteTextViewer
			viewerStyle={{display:'flex', flex:1}}
			ref={this.viewerRef_}
			onDomReady={this.viewer_domReady}
		/>

		return (
			<div style={style.root}>
				{titleInput}
				{viewer}
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
	};
};

const NoteRevisionViewer = connect(mapStateToProps)(NoteRevisionViewerComponent);

module.exports = NoteRevisionViewer;