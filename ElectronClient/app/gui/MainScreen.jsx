const React = require('react');
const { connect } = require('react-redux');
const { Header } = require('./Header.min.js');
const { SideBar } = require('./SideBar.min.js');
const { NoteList } = require('./NoteList.min.js');
const { NoteText } = require('./NoteText.min.js');
const { PromptDialog } = require('./PromptDialog.min.js');
const NotePropertiesDialog = require('./NotePropertiesDialog.min.js');
const Setting = require('lib/models/Setting.js');
const BaseModel = require('lib/BaseModel.js');
const Tag = require('lib/models/Tag.js');
const Note = require('lib/models/Note.js');
const { uuid } = require('lib/uuid.js');
const Folder = require('lib/models/Folder.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { bridge } = require('electron').remote.require('./bridge');
const eventManager = require('../eventManager');
const VerticalResizer = require('./VerticalResizer.min');
const PluginManager = require('lib/services/PluginManager');

class MainScreenComponent extends React.Component {
	constructor() {
		super();

		this.notePropertiesDialog_close = this.notePropertiesDialog_close.bind(this);
		this.sidebar_onDrag = this.sidebar_onDrag.bind(this);
		this.noteList_onDrag = this.noteList_onDrag.bind(this);
	}

	sidebar_onDrag(event) {
		Setting.setValue('style.sidebar.width', this.props.sidebarWidth + event.deltaX);
	}

	noteList_onDrag(event) {
		Setting.setValue('style.noteList.width', Setting.value('style.noteList.width') + event.deltaX);
	}

	notePropertiesDialog_close() {
		this.setState({ notePropertiesDialogOptions: {} });
	}

	componentWillMount() {
		this.setState({
			promptOptions: null,
			modalLayer: {
				visible: false,
				message: '',
			},
			notePropertiesDialogOptions: {},
		});
	}

	componentWillReceiveProps(newProps) {
		if (newProps.windowCommand) {
			this.doCommand(newProps.windowCommand);
		}
	}

	toggleVisiblePanes() {
		this.props.dispatch({
			type: 'NOTE_VISIBLE_PANES_TOGGLE',
		});
	}

	toggleSidebar() {
		this.props.dispatch({
			type: 'SIDEBAR_VISIBILITY_TOGGLE',
		});
	}

	toggleNoteList() {
		this.props.dispatch({
			type: 'NOTELIST_VISIBILITY_TOGGLE',
		});
	}

	async doCommand(command) {
		if (!command) return;

		const createNewNote = async (template, isTodo) => {
			const folderId = Setting.value('activeFolderId');
			if (!folderId) return;

			const newNote = {
				parent_id: folderId,
				template: template,
				is_todo: isTodo ? 1 : 0,
			};

			this.props.dispatch({
				type: 'NOTE_SET_NEW_ONE',
				item: newNote,
			});
		};

		let commandProcessed = true;

		if (command.name === 'newNote') {
			if (!this.props.folders.length) {
				bridge().showErrorMessageBox(_('Please create a notebook first.'));
			} else {
				await createNewNote(null, false);
			}
		} else if (command.name === 'newTodo') {
			if (!this.props.folders.length) {
				bridge().showErrorMessageBox(_('Please create a notebook first'));
			} else {
				await createNewNote(null, true);
			}
		} else if (command.name === 'newNotebook' || (command.name === 'newSubNotebook' && command.activeFolderId)) {
			this.setState({
				promptOptions: {
					label: _('Notebook title:'),
					onClose: async answer => {
						if (answer) {
							let folder = null;
							try {
								folder = await Folder.save({ title: answer }, { userSideValidation: true });
								if (command.name === 'newSubNotebook') folder = await Folder.moveToFolder(folder.id, command.activeFolderId);
							} catch (error) {
								bridge().showErrorMessageBox(error.message);
							}

							if (folder) {
								this.props.dispatch({
									type: 'FOLDER_SELECT',
									id: folder.id,
								});
							}
						}

						this.setState({ promptOptions: null });
					},
				},
			});
		} else if (command.name === 'setTags') {
			const tags = await Tag.tagsByNoteId(command.noteId);
			const noteTags = tags
				.map(a => {
					return { value: a.id, label: a.title };
				})
				.sort((a, b) => {
					// sensitivity accent will treat accented characters as differemt
					// but treats caps as equal
					return a.label.localeCompare(b.label, undefined, {sensitivity: 'accent'});
				});
			const allTags = await Tag.allWithNotes();
			const tagSuggestions = allTags.map(a => {
				return { value: a.id, label: a.title };
			});

			this.setState({
				promptOptions: {
					label: _('Add or remove tags:'),
					inputType: 'tags',
					value: noteTags,
					autocomplete: tagSuggestions,
					onClose: async answer => {
						if (answer !== null) {
							const tagTitles = answer.map(a => {
								return a.label.trim();
							});
							await Tag.setNoteTagsByTitles(command.noteId, tagTitles);
						}
						this.setState({ promptOptions: null });
					},
				},
			});
		} else if (command.name === 'renameFolder') {
			const folder = await Folder.load(command.id);

			if (folder) {
				this.setState({
					promptOptions: {
						label: _('Rename notebook:'),
						value: folder.title,
						onClose: async answer => {
							if (answer !== null) {
								try {
									folder.title = answer;
									await Folder.save(folder, { fields: ['title'], userSideValidation: true });
								} catch (error) {
									bridge().showErrorMessageBox(error.message);
								}
							}
							this.setState({ promptOptions: null });
						},
					},
				});
			}
		} else if (command.name === 'renameTag') {
			const tag = await Tag.load(command.id);
			if (tag) {
				this.setState({
					promptOptions: {
						label: _('Rename tag:'),
						value: tag.title,
						onClose: async answer => {
							if (answer !== null) {
								try {
									tag.title = answer;
									await Tag.save(tag, { fields: ['title'], userSideValidation: true });
								} catch (error) {
									bridge().showErrorMessageBox(error.message);
								}
							}
							this.setState({ promptOptions: null });
						},
					},
				});
			}
		} else if (command.name === 'search') {
			if (!this.searchId_) this.searchId_ = uuid.create();

			this.props.dispatch({
				type: 'SEARCH_UPDATE',
				search: {
					id: this.searchId_,
					title: command.query,
					query_pattern: command.query,
					query_folder_id: null,
					type_: BaseModel.TYPE_SEARCH,
				},
			});

			if (command.query) {
				this.props.dispatch({
					type: 'SEARCH_SELECT',
					id: this.searchId_,
				});
			} else {
				const note = await Note.load(this.props.selectedNoteId);
				if (note) {
					this.props.dispatch({
						type: 'FOLDER_AND_NOTE_SELECT',
						folderId: note.parent_id,
						noteId: note.id,
					});
				}
			}
		} else if (command.name === 'commandNoteProperties') {
			this.setState({
				notePropertiesDialogOptions: {
					noteId: command.noteId,
					visible: true,
					onRevisionLinkClick: command.onRevisionLinkClick,
				},
			});
		} else if (command.name === 'toggleVisiblePanes') {
			this.toggleVisiblePanes();
		} else if (command.name === 'toggleSidebar') {
			this.toggleSidebar();
		} else if (command.name === 'toggleNoteList') {
			this.toggleNoteList();
		} else if (command.name === 'showModalMessage') {
			this.setState({
				modalLayer: {
					visible: true,
					message:
						<div className="modal-message">
							<div id="loading-animation" />
							<div className="text">{command.message}</div>
						</div>,
				},
			});
		} else if (command.name === 'hideModalMessage') {
			this.setState({ modalLayer: { visible: false, message: '' } });
		} else if (command.name === 'editAlarm') {
			const note = await Note.load(command.noteId);

			let defaultDate = new Date(Date.now() + 2 * 3600 * 1000);
			defaultDate.setMinutes(0);
			defaultDate.setSeconds(0);

			this.setState({
				promptOptions: {
					label: _('Set alarm:'),
					inputType: 'datetime',
					buttons: ['ok', 'cancel', 'clear'],
					value: note.todo_due ? new Date(note.todo_due) : defaultDate,
					onClose: async (answer, buttonType) => {
						let newNote = null;

						if (buttonType === 'clear') {
							newNote = {
								id: note.id,
								todo_due: 0,
							};
						} else if (answer !== null) {
							newNote = {
								id: note.id,
								todo_due: answer.getTime(),
							};
						}

						if (newNote) {
							await Note.save(newNote);
							eventManager.emit('alarmChange', { noteId: note.id });
						}

						this.setState({ promptOptions: null });
					},
				},
			});
		} else if (command.name === 'selectTemplate') {
			this.setState({
				promptOptions: {
					label: _('Template file:'),
					inputType: 'dropdown',
					value: this.props.templates[0], // Need to start with some value
					autocomplete: this.props.templates,
					onClose: async answer => {
						if (answer) {
							if (command.noteType === 'note' || command.noteType === 'todo') {
								createNewNote(answer.value, command.noteType === 'todo');
							} else {
								this.props.dispatch({
									type: 'WINDOW_COMMAND',
									name: 'insertTemplate',
									value: answer.value,
								});
							}
						}

						this.setState({ promptOptions: null });
					},
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

	styles(themeId, width, height, messageBoxVisible, isSidebarVisible, isNoteListVisible, sidebarWidth, noteListWidth) {
		const styleKey = [themeId, width, height, messageBoxVisible, +isSidebarVisible, +isNoteListVisible, sidebarWidth, noteListWidth].join('_');
		if (styleKey === this.styleKey_) return this.styles_;

		const theme = themeStyle(themeId);

		this.styleKey_ = styleKey;

		this.styles_ = {};

		this.styles_.header = {
			width: width,
		};

		this.styles_.messageBox = {
			width: width,
			height: 30,
			display: 'flex',
			alignItems: 'center',
			paddingLeft: 10,
			backgroundColor: theme.warningBackgroundColor,
		};

		this.styles_.verticalResizer = {
			width: 5,
			height: height,
			display: 'inline-block',
		};

		const rowHeight = height - theme.headerHeight - (messageBoxVisible ? this.styles_.messageBox.height : 0);

		this.styles_.sideBar = {
			width: sidebarWidth - this.styles_.verticalResizer.width,
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		if (isSidebarVisible === false) {
			this.styles_.sideBar.width = 0;
			this.styles_.sideBar.display = 'none';
		}

		this.styles_.noteList = {
			width: noteListWidth - this.styles_.verticalResizer.width,
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		if (isNoteListVisible === false) {
			this.styles_.noteList.width = 0;
			this.styles_.noteList.display = 'none';
			this.styles_.verticalResizer.display = 'none';
		}

		this.styles_.noteText = {
			width: Math.floor(width - this.styles_.sideBar.width - this.styles_.noteList.width - 10),
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

		this.styles_.prompt = {
			width: width,
			height: height,
		};

		this.styles_.modalLayer = Object.assign({}, theme.textStyle, {
			zIndex: 10000,
			position: 'absolute',
			top: 0,
			left: 0,
			backgroundColor: theme.backgroundColor,
			width: width - 20,
			height: height - 20,
			padding: 10,
		});

		return this.styles_;
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = Object.assign(
			{
				color: theme.color,
				backgroundColor: theme.backgroundColor,
			},
			this.props.style
		);
		const promptOptions = this.state.promptOptions;
		const folders = this.props.folders;
		const notes = this.props.notes;
		const messageBoxVisible = this.props.hasDisabledSyncItems || this.props.showMissingMasterKeyMessage;
		const sidebarVisibility = this.props.sidebarVisibility;
		const noteListVisibility = this.props.noteListVisibility;
		const styles = this.styles(this.props.theme, style.width, style.height, messageBoxVisible, sidebarVisibility, noteListVisibility, this.props.sidebarWidth, this.props.noteListWidth);
		const onConflictFolder = this.props.selectedFolderId === Folder.conflictFolderId();

		const headerItems = [];

		headerItems.push({
			title: _('Toggle sidebar'),
			iconName: 'fa-bars',
			iconRotation: this.props.sidebarVisibility ? 0 : 90,
			onClick: () => {
				this.doCommand({ name: 'toggleSidebar' });
			},
		});

		headerItems.push({
			title: _('Toggle note list'),
			iconName: 'fa-align-justify',
			iconRotation: noteListVisibility ? 0 : 90,
			onClick: () => {
				this.doCommand({ name: 'toggleNoteList' });
			},
		});

		headerItems.push({
			title: _('New note'),
			iconName: 'fa-file-o',
			enabled: !!folders.length && !onConflictFolder,
			onClick: () => {
				this.doCommand({ name: 'newNote' });
			},
		});

		headerItems.push({
			title: _('New to-do'),
			iconName: 'fa-check-square-o',
			enabled: !!folders.length && !onConflictFolder,
			onClick: () => {
				this.doCommand({ name: 'newTodo' });
			},
		});

		headerItems.push({
			title: _('New notebook'),
			iconName: 'fa-book',
			onClick: () => {
				this.doCommand({ name: 'newNotebook' });
			},
		});

		headerItems.push({
			title: _('Layout'),
			iconName: 'fa-columns',
			enabled: !!notes.length,
			onClick: () => {
				this.doCommand({ name: 'toggleVisiblePanes' });
			},
		});

		headerItems.push({
			title: _('Search...'),
			iconName: 'fa-search',
			onQuery: query => {
				this.doCommand({ name: 'search', query: query });
			},
			type: 'search',
		});

		if (!this.promptOnClose_) {
			this.promptOnClose_ = (answer, buttonType) => {
				return this.state.promptOptions.onClose(answer, buttonType);
			};
		}

		const onViewDisabledItemsClick = () => {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Status',
			});
		};

		const onViewMasterKeysClick = () => {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Config',
				props: {
					defaultSection: 'encryption',
				},
			});
		};

		let messageComp = null;

		if (messageBoxVisible) {
			let msg = null;
			if (this.props.hasDisabledSyncItems) {
				msg = (
					<span>
						{_('Some items cannot be synchronised.')}{' '}
						<a
							href="#"
							onClick={() => {
								onViewDisabledItemsClick();
							}}
						>
							{_('View them now')}
						</a>
					</span>
				);
			} else if (this.props.showMissingMasterKeyMessage) {
				msg = (
					<span>
						{_('One or more master keys need a password.')}{' '}
						<a
							href="#"
							onClick={() => {
								onViewMasterKeysClick();
							}}
						>
							{_('Set the password')}
						</a>
					</span>
				);
			}

			messageComp = (
				<div style={styles.messageBox}>
					<span style={theme.textStyle}>{msg}</span>
				</div>
			);
		}

		const dialogInfo = PluginManager.instance().pluginDialogToShow(this.props.plugins);
		const pluginDialog = !dialogInfo ? null : <dialogInfo.Dialog {...dialogInfo.props} />;

		const modalLayerStyle = Object.assign({}, styles.modalLayer, { display: this.state.modalLayer.visible ? 'block' : 'none' });

		const notePropertiesDialogOptions = this.state.notePropertiesDialogOptions;

		return (
			<div style={style}>
				<div style={modalLayerStyle}>{this.state.modalLayer.message}</div>

				{notePropertiesDialogOptions.visible && <NotePropertiesDialog theme={this.props.theme} noteId={notePropertiesDialogOptions.noteId} onClose={this.notePropertiesDialog_close} onRevisionLinkClick={notePropertiesDialogOptions.onRevisionLinkClick} />}

				<PromptDialog autocomplete={promptOptions && 'autocomplete' in promptOptions ? promptOptions.autocomplete : null} defaultValue={promptOptions && promptOptions.value ? promptOptions.value : ''} theme={this.props.theme} style={styles.prompt} onClose={this.promptOnClose_} label={promptOptions ? promptOptions.label : ''} description={promptOptions ? promptOptions.description : null} visible={!!this.state.promptOptions} buttons={promptOptions && 'buttons' in promptOptions ? promptOptions.buttons : null} inputType={promptOptions && 'inputType' in promptOptions ? promptOptions.inputType : null} />

				<Header style={styles.header} showBackButton={false} items={headerItems} />
				{messageComp}
				<SideBar style={styles.sideBar} />
				<VerticalResizer style={styles.verticalResizer} onDrag={this.sidebar_onDrag} />
				<NoteList style={styles.noteList} />
				<VerticalResizer style={styles.verticalResizer} onDrag={this.noteList_onDrag} />
				<NoteText style={styles.noteText} visiblePanes={this.props.noteVisiblePanes} noteDevToolsVisible={this.props.noteDevToolsVisible} />

				{pluginDialog}
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
		windowCommand: state.windowCommand,
		noteVisiblePanes: state.noteVisiblePanes,
		sidebarVisibility: state.sidebarVisibility,
		noteListVisibility: state.noteListVisibility,
		folders: state.folders,
		notes: state.notes,
		hasDisabledSyncItems: state.hasDisabledSyncItems,
		showMissingMasterKeyMessage: state.notLoadedMasterKeys.length && state.masterKeys.length,
		selectedFolderId: state.selectedFolderId,
		sidebarWidth: state.settings['style.sidebar.width'],
		noteListWidth: state.settings['style.noteList.width'],
		selectedNoteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null,
		plugins: state.plugins,
		noteDevToolsVisible: state.noteDevToolsVisible,
		templates: state.templates,
	};
};

const MainScreen = connect(mapStateToProps)(MainScreenComponent);

module.exports = { MainScreen };
