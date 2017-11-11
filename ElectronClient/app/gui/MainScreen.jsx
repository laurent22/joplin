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
		this.setState({
			newNotePromptVisible: false,
			newFolderPromptVisible: false,
			promptOptions: null,
			noteVisiblePanes: ['editor', 'viewer'],
		});
	}

	componentWillReceiveProps(newProps) {
		if (newProps.windowCommand) {
			this.doCommand(newProps.windowCommand);
		}
	}

	toggleVisiblePanes() {
		let panes = this.state.noteVisiblePanes.slice();
		if (panes.length === 2) {
			panes = ['editor'];
		} else if (panes.indexOf('editor') >= 0) {
			panes = ['viewer'];
		} else if (panes.indexOf('viewer') >= 0) {
			panes = ['editor', 'viewer'];
		}

		this.setState({ noteVisiblePanes: panes });
	}

	doCommand(command) {
		if (!command) return;

		const createNewNote = async (title, isTodo) => {
			const folderId = Setting.value('activeFolderId');
			if (!folderId) return;

			const note = await Note.save({
				title: title,
				parent_id: folderId,
				is_todo: isTodo ? 1 : 0,
			});
			Note.updateGeolocation(note.id);

			this.props.dispatch({
				type: 'NOTE_SELECT',
				id: note.id,
			});
		}

		let commandProcessed = true;

		if (command.name === 'newNote') {
			this.setState({
				promptOptions: {
					message: _('Note title:'),
					onClose: async (answer) => {
						if (answer) await createNewNote(answer, false);
						this.setState({ promptOptions: null });
					}
				},
			});
		} else if (command.name === 'newTodo') {
			this.setState({
				promptOptions: {
					message: _('To-do title:'),
					onClose: async (answer) => {
						if (answer) await createNewNote(answer, true);
						this.setState({ promptOptions: null });
					}
				},
			});
		} else if (command.name === 'newNotebook') {
			this.setState({
				promptOptions: {
					message: _('Notebook title:'),
					onClose: async (answer) => {
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

						this.setState({ promptOptions: null });
					}
				},
			});
		} else {
			commandProcessed = false;
		}

		if (commandProcessed) {
			this.props.dispatch({
				type: 'WINDOW_COMMAND',
				name: null,
			});
		}
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const promptOptions = this.state.promptOptions;

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

		const headerButtons = [];

		headerButtons.push({
			title: _('New note'),
			iconName: 'fa-file-o',
			onClick: () => { this.doCommand({ name: 'newNote' }) },
		});
				
		headerButtons.push({
			title: _('New to-do'),
			iconName: 'fa-check-square-o',
			onClick: () => { this.doCommand({ name: 'newTodo' }) },
		});

		headerButtons.push({
			title: _('New notebook'),
			iconName: 'fa-folder-o',
			onClick: () => { this.doCommand({ name: 'newNotebook' }) },
		});

		headerButtons.push({
			title: _('Layout'),
			iconName: 'fa-columns',
			onClick: () => {
				this.toggleVisiblePanes();
			},
		});

		return (
			<div style={style}>
				<PromptDialog theme={this.props.theme} style={promptStyle} onClose={(answer) => promptOptions.onClose(answer)} message={promptOptions ? promptOptions.message : ''} visible={!!this.state.promptOptions}/>
				<Header style={headerStyle} showBackButton={false} buttons={headerButtons} />
				<SideBar style={sideBarStyle} />
				<NoteList itemHeight={40} style={noteListStyle} />
				<NoteText style={noteTextStyle} visiblePanes={this.state.noteVisiblePanes} />
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
		windowCommand: state.windowCommand,
	};
};

const MainScreen = connect(mapStateToProps)(MainScreenComponent);

module.exports = { MainScreen };