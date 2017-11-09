const React = require('react');
const { connect } = require('react-redux');
const { Header } = require('./Header.min.js');
const { SideBar } = require('./SideBar.min.js');
const { NoteList } = require('./NoteList.min.js');
const { NoteText } = require('./NoteText.min.js');
const { PromptDialog } = require('./PromptDialog.min.js');
const { Setting } = require('lib/models/setting.js');
const { Note } = require('lib/models/note.js');
const { Folder } = require('lib/models/folder.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const layoutUtils = require('lib/layout-utils.js');
const { bridge } = require('electron').remote.require('./bridge');

class MainScreenComponent extends React.Component {

	componentWillMount() {
		this.setState({ newNotePromptVisible: false });
		this.setState({ newFolderPromptVisible: false });
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);

		const headerStyle = {
			width: style.width,
		};

		const rowHeight = style.height - theme.headerHeight;

		const sideBarStyle = {
			width: Math.floor(layoutUtils.size(style.width * .2, 100, 300)),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const noteListStyle = {
			width: Math.floor(layoutUtils.size(style.width * .2, 100, 300)),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		const noteTextStyle = {
			width: Math.floor(layoutUtils.size(style.width - sideBarStyle.width - noteListStyle.width, 0)),
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
				iconName: 'ion-document',
			}, {
				title: _('New notebook'),
				onClick: () => {
					this.setState({ newFolderPromptVisible: true });
				},
				iconName: 'ion-android-folder-open',
			},
		];

		const newNotePromptOnClose = async (answer) => {
			if (answer) {
				const folderId = Setting.value('activeFolderId');
				if (!folderId) return;

				const note = await Note.save({
					title: answer,
					parent_id: folderId,
				});
				Note.updateGeolocation(note.id);

				this.props.dispatch({
					type: 'NOTE_SELECT',
					id: note.id,
				});
			}

			this.setState({ newNotePromptVisible: false });
		}

		const newFolderPromptOnClose = async (answer) => {
			if (answer) {
				let folder = null;
				try {
					folder = await Folder.save({ title: answer }, { userSideValidation: true });		
				} catch (error) {
					bridge().showErrorMessageBox(error.message);
					return;
				}

				this.props.dispatch({
					type: 'FOLDER_SELECT',
					id: folder.id,
				});
			}

			this.setState({ newFolderPromptVisible: false });
		}

		return (
			<div style={style}>
				<PromptDialog style={promptStyle} onClose={(answer) => newNotePromptOnClose(answer)}   message={_('Note title:')}     visible={this.state.newNotePromptVisible}/>
				<PromptDialog style={promptStyle} onClose={(answer) => newFolderPromptOnClose(answer)} message={_('Notebook title:')} visible={this.state.newFolderPromptVisible}/>
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