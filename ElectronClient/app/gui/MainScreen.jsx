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
const layoutUtils = require('lib/layout-utils.js');
const { bridge } = require('electron').remote.require('./bridge');
const eventManager = require('../eventManager');
const VerticalResizer = require('./VerticalResizer.min');
const { Drawer, DrawerAppContent } = require('@rmwc/drawer');
const { Dialog, DialogContent } = require('@rmwc/dialog');
const { Grid, GridCell, GridInner } = require('@rmwc/grid');

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

	async doCommand(command) {
		if (!command) return;

		const createNewNote = async (title, isTodo) => {
			const folderId = Setting.value('activeFolderId');
			if (!folderId) return;

			const newNote = {
				parent_id: folderId,
				is_todo: isTodo ? 1 : 0,
			};

			this.props.dispatch({
				type: 'NOTE_SET_NEW_ONE',
				item: newNote,
			});
		}

		let commandProcessed = true;

		if (command.name === 'newNote') {
			if (!this.props.folders.length) {
				bridge().showErrorMessageBox(_('Please create a notebook first.'));
				return;
			}

			await createNewNote(null, false);
		} else if (command.name === 'newTodo') {
			if (!this.props.folders.length) {
				bridge().showErrorMessageBox(_('Please create a notebook first'));
				return;
			}

			await createNewNote(null, true);
		} else if (command.name === 'newNotebook') {
			this.setState({
				promptOptions: {
					label: _('Notebook title:'),
					onClose: async (answer) => {
						if (answer) {
							let folder = null;
							try {
								folder = await Folder.save({ title: answer }, { userSideValidation: true });
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
					}
				},
			});
		} else if (command.name === 'setTags') {
			const tags = await Tag.tagsByNoteId(command.noteId);
			const tagTitles = tags.map((a) => { return a.title }).sort();

			this.setState({
				promptOptions: {
					label: _('Add or remove tags:'),
					description: _('Separate each tag by a comma.'),
					value: tagTitles.join(', '),
					onClose: async (answer) => {
						if (answer !== null) {
							const tagTitles = answer.split(',').map((a) => { return a.trim() });
							await Tag.setNoteTagsByTitles(command.noteId, tagTitles);
						}
						this.setState({ promptOptions: null });
					}
				},
			});
		} else if (command.name === 'renameFolder') {
			const folder = await Folder.load(command.id);
			if (!folder) return;

			this.setState({
				promptOptions: {
					label: _('Rename notebook:'),
					value: folder.title,
					onClose: async (answer) => {
						if (answer !== null) {
							try {
								folder.title = answer;
								await Folder.save(folder, { fields: ['title'], userSideValidation: true });
							} catch (error) {
								bridge().showErrorMessageBox(error.message);
							}
						}
						this.setState({ promptOptions: null });
					}
				},
			});
		} else if (command.name === 'renameTag') {
			const tag = await Tag.load(command.id);
			if (!tag) return;

			this.setState({
				promptOptions: {
					label: _('Rename tag:'),
					value: tag.title,
					onClose: async (answer) => {
						if (answer !== null) {
							try {
								tag.title = answer;
								await Tag.save(tag, { fields: ['title'], userSideValidation: true });
							} catch (error) {
								bridge().showErrorMessageBox(error.message);
							}
						}
						this.setState({ promptOptions: null });
					}
				}
			})

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
						type: "FOLDER_AND_NOTE_SELECT",
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
				},
			});
		} else if (command.name === 'toggleVisiblePanes') {
			this.toggleVisiblePanes();
		} else if (command.name === 'toggleSidebar') {
			this.toggleSidebar();
		} else if (command.name === 'showModalMessage') {
			this.setState({ modalLayer: { visible: true, message: command.message } });
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

	styles(themeId, width, height, messageBoxVisible, sidebarWidth, noteListWidth) {
		const styleKey = [themeId, width, height, messageBoxVisible, sidebarWidth, noteListWidth].join('_');
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
		}

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


		this.styles_.noteList = {
			width: noteListWidth - this.styles_.verticalResizer.width,
			height: rowHeight,
			display: 'inline-block',
			verticalAlign: 'top',
		};

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
		const style = Object.assign({
			color: theme.color,
			backgroundColor: theme.backgroundColor,
		}, this.props.style);
		const promptOptions = this.state.promptOptions;
		const folders = this.props.folders;
		const notes = this.props.notes;
		const messageBoxVisible = this.props.hasDisabledSyncItems || this.props.showMissingMasterKeyMessage;
		const sidebarVisibility = this.props.sidebarVisibility;
		const styles = this.styles(this.props.theme, style.width, style.height, messageBoxVisible, this.props.sidebarWidth, this.props.noteListWidth);
		const selectedFolderId = this.props.selectedFolderId;
		const onConflictFolder = this.props.selectedFolderId === Folder.conflictFolderId();

		const headerItems = [];

		headerItems.push({
			title: _('Toggle sidebar'),
			iconName: 'menu',
			iconRotation: this.props.sidebarVisibility ? 0 : 90,
			onClick: () => { this.doCommand({ name: 'toggleSidebar' }) },
			type: 'menu'
		});

		headerItems.push({
			title: _('New note'),
			iconName: 'note_add',
			enabled: !!folders.length && !onConflictFolder,
			onClick: () => { this.doCommand({ name: 'newNote' }) }
		});

		headerItems.push({
			title: _('New to-do'),
			iconName: 'event',
			enabled: !!folders.length && !onConflictFolder,
			onClick: () => { this.doCommand({ name: 'newTodo' }) },
		});

		headerItems.push({
			title: _('New notebook'),
			iconName: 'library_add',
			onClick: () => { this.doCommand({ name: 'newNotebook' }) },
		});

		headerItems.push({
			title: _('Layout'),
			iconName: 'view_array',
			enabled: !!notes.length,
			onClick: () => { this.doCommand({ name: 'toggleVisiblePanes' }) },
		});

		headerItems.push({
			title: _('Search...'),
			iconName: 'search',
			onQuery: (query) => { this.doCommand({ name: 'search', query: query }) },
			type: 'search',
		});

		if (!this.promptOnClose_) {
			this.promptOnClose_ = (answer, buttonType) => {
				return this.state.promptOptions.onClose(answer, buttonType);
			}
		}

		const onViewDisabledItemsClick = () => {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Status',
			});
		}

		const onViewMasterKeysClick = () => {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'EncryptionConfig',
			});
		}

		let messageComp = null;

		if (messageBoxVisible) {
			let msg = null;
			if (this.props.hasDisabledSyncItems) {
				msg = <span>{_('Some items cannot be synchronised.')} <a href="#" onClick={() => { onViewDisabledItemsClick() }}>{_('View them now')}</a></span>
			} else if (this.props.showMissingMasterKeyMessage) {
				msg = <span>{_('Some items cannot be decrypted.')} <a href="#" onClick={() => { onViewMasterKeysClick() }}>{_('Set the password')}</a></span>
			}

			messageComp = (
				<div style={styles.messageBox}>
					<span style={theme.textStyle}>
						{msg}
					</span>
				</div>
			);
		}


		const notePropertiesDialogOptions = this.state.notePropertiesDialogOptions;

		return (
			<div >
				<Dialog><DialogContent>{this.state.modalLayer.message}</DialogContent></Dialog>
				{/* <div style={modalLayerStyle}>{this.state.modalLayer.message}</div> */}

				{notePropertiesDialogOptions.visible && <NotePropertiesDialog
					theme={this.props.theme}
					noteId={notePropertiesDialogOptions.noteId}
					onClose={this.notePropertiesDialog_close}
				/>}


				<PromptDialog
					autocomplete={promptOptions && ('autocomplete' in promptOptions) ? promptOptions.autocomplete : null}
					defaultValue={promptOptions && promptOptions.value ? promptOptions.value : ''}
					theme={this.props.theme}
					style={styles.prompt}
					onClose={this.promptOnClose_}
					label={promptOptions ? promptOptions.label : ''}
					description={promptOptions ? promptOptions.description : null}
					visible={!!this.state.promptOptions}
					buttons={promptOptions && ('buttons' in promptOptions) ? promptOptions.buttons : null}
					inputType={promptOptions && ('inputType' in promptOptions) ? promptOptions.inputType : null} />


				<Drawer dismissible open={this.props.sidebarVisibility == undefined ? true : this.props.sidebarVisibility}>
					<SideBar style={styles.sideBar} />
				</Drawer>
				<DrawerAppContent>

					<Header showBackButton={false} items={headerItems} />
					{messageComp}

					<Grid>
						{/* <GridInner> */}
						<GridCell span={2}>
							<NoteList
								style={styles.noteList}
							/>
							{/* <VerticalResizer style={styles.verticalResizer} onDrag={this.noteList_onDrag} /> */}
						</GridCell>

						<GridCell span={10}>
							<NoteText style={styles.noteText} visiblePanes={this.props.noteVisiblePanes} />
						</GridCell>

						{/* </GridInner> */}
					</Grid>

				</DrawerAppContent>


			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
		windowCommand: state.windowCommand,
		noteVisiblePanes: state.noteVisiblePanes,
		sidebarVisibility: state.sidebarVisibility,
		folders: state.folders,
		notes: state.notes,
		hasDisabledSyncItems: state.hasDisabledSyncItems,
		showMissingMasterKeyMessage: state.notLoadedMasterKeys.length && state.masterKeys.length,
		selectedFolderId: state.selectedFolderId,
		sidebarVisibility: state.sidebarVisibility,
		sidebarWidth: state.settings['style.sidebar.width'],
		noteListWidth: state.settings['style.noteList.width'],
		selectedNoteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null,
	};
};

const MainScreen = connect(mapStateToProps)(MainScreenComponent);

module.exports = { MainScreen };
