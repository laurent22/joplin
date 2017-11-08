const React = require('react');
const { connect } = require('react-redux');
const { Header } = require('./Header.min.js');
const { SideBar } = require('./SideBar.min.js');
const { NoteList } = require('./NoteList.min.js');
const { NoteText } = require('./NoteText.min.js');
const { PromptDialog } = require('./PromptDialog.min.js');
const { Setting } = require('lib/models/setting.js');
const { Note } = require('lib/models/note.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const layoutUtils = require('lib/layout-utils.js');
const { bridge } = require('electron').remote.require('./bridge');

class MainScreenComponent extends React.Component {

	componentWillMount() {
		this.setState({ newNotePromptVisible: false });
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);

		const headerStyle = {
			width: style.width,
		};

		const rowHeight = style.height - theme.headerHeight;

		const sideBarStyle = {
			width: layoutUtils.size(style.width * .2, 100, 300),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const noteListStyle = {
			width: layoutUtils.size(style.width * .2, 100, 300),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const noteTextStyle = {
			width: layoutUtils.size(style.width - sideBarStyle.width - noteListStyle.width, 0),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const promptStyle = {
			width: style.width,
			height: style.height,
		};

		const headerButtons = [
			{
				title: _('New note'),
				onClick: () => {
					this.setState({ newNotePromptVisible: true });
				},
			},
		];

		const newNotePromptOnAccept = async (answer) => {
			const folderId = Setting.value('activeFolderId');
			if (!folderId) return;

			const note = await Note.save({
				title: answer,
				parent_id: folderId,
			});
			Note.updateGeolocation(note.id);

			this.props.dispatch({
				type: 'NOTES_SELECT',
				noteId: note.id,
			});
		}

		return (
			<div style={style}>
				<PromptDialog style={promptStyle} onAccept={(answer) => newNotePromptOnAccept(answer)} message={_('Note title:')} visible={this.state.newNotePromptVisible}/>
				<Header style={headerStyle} showBackButton={false} buttons={headerButtons} />
				<SideBar style={sideBarStyle} />
				<NoteList itemHeight={40} style={noteListStyle} />
				<NoteText style={noteTextStyle} />
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.theme,
	};
};

const MainScreen = connect(mapStateToProps)(MainScreenComponent);

module.exports = { MainScreen };