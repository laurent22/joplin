const React = require('react');
const { connect } = require('react-redux');
const { Header } = require('./Header.min.js');
const { SideBar } = require('./SideBar.min.js');
const { NoteList } = require('./NoteList.min.js');
const { NoteText } = require('./NoteText.min.js');
const NoteText2 = require('./NoteText2.js').default;
const { PromptDialog } = require('./PromptDialog.min.js');
const NoteContentPropertiesDialog = require('./NoteContentPropertiesDialog.js').default;
const NotePropertiesDialog = require('./NotePropertiesDialog.min.js');
const ShareNoteDialog = require('./ShareNoteDialog.js').default;
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
const TemplateUtils = require('lib/TemplateUtils');
const EncryptionService = require('lib/services/EncryptionService');

class MainScreenComponent extends React.Component {
	constructor() {
		super();

		this.notePropertiesDialog_close = this.notePropertiesDialog_close.bind(this);
		this.noteContentPropertiesDialog_close = this.noteContentPropertiesDialog_close.bind(this);
		this.shareNoteDialog_close = this.shareNoteDialog_close.bind(this);
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

	noteContentPropertiesDialog_close() {
		this.setState({ noteContentPropertiesDialogOptions: {} });
	}

	shareNoteDialog_close() {
		this.setState({ shareNoteDialogOptions: {} });
	}

	UNSAFE_componentWillMount() {
		this.setState({
			promptOptions: null,
			modalLayer: {
				visible: false,
				message: '',
			},
			notePropertiesDialogOptions: {},
			noteContentPropertiesDialogOptions: {},
			shareNoteDialogOptions: {},
		});
	}

	UNSAFE_componentWillReceiveProps(newProps) {
		// Execute a command if any, and if we haven't already executed it
		if (newProps.windowCommand && newProps.windowCommand !== this.props.windowCommand) {
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

			const body = template ? TemplateUtils.render(template) : '';

			const newNote = await Note.save({
				parent_id: folderId,
				is_todo: isTodo ? 1 : 0,
				body: body,
			}, { provisional: true });

			this.props.dispatch({
				type: 'NOTE_SELECT',
				id: newNote.id,
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
			const tags = await Tag.commonTagsByNoteIds(command.noteIds);
			const startTags = tags
				.map(a => {
					return { value: a.id, label: a.title };
				})
				.sort((a, b) => {
					// sensitivity accent will treat accented characters as differemt
					// but treats caps as equal
					return a.label.localeCompare(b.label, undefined, { sensitivity: 'accent' });
				});
			const allTags = await Tag.allWithNotes();
			const tagSuggestions = allTags.map(a => {
				return { value: a.id, label: a.title };
			})
				.sort((a, b) => {
				// sensitivity accent will treat accented characters as differemt
				// but treats caps as equal
					return a.label.localeCompare(b.label, undefined, { sensitivity: 'accent' });
				});

			this.setState({
				promptOptions: {
					label: _('Add or remove tags:'),
					inputType: 'tags',
					value: startTags,
					autocomplete: tagSuggestions,
					onClose: async answer => {
						if (answer !== null) {
							const endTagTitles = answer.map(a => {
								return a.label.trim();
							});
							if (command.noteIds.length === 1) {
								await Tag.setNoteTagsByTitles(command.noteIds[0], endTagTitles);
							} else {
								const startTagTitles = startTags.map(a => { return a.label.trim(); });
								const addTags = endTagTitles.filter(value => !startTagTitles.includes(value));
								const delTags = startTagTitles.filter(value => !endTagTitles.includes(value));

								// apply the tag additions and deletions to each selected note
								for (let i = 0; i < command.noteIds.length; i++) {
									const tags = await Tag.tagsByNoteId(command.noteIds[i]);
									let tagTitles = tags.map(a => { return a.title; });
									tagTitles = tagTitles.concat(addTags);
									tagTitles = tagTitles.filter(value => !delTags.includes(value));
									await Tag.setNoteTagsByTitles(command.noteIds[i], tagTitles);
								}
							}
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
		} else if (command.name === 'commandContentProperties') {
			this.setState({
				noteContentPropertiesDialogOptions: {
					visible: true,
					text: command.text,
					lines: command.lines,
				},
			});
		} else if (command.name === 'commandShareNoteDialog') {
			this.setState({
				shareNoteDialogOptions: {
					noteIds: command.noteIds,
					visible: true,
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

		const rowHeight = height - theme.headerHeight - (messageBoxVisible ? this.styles_.messageBox.height : 0);

		this.styles_.verticalResizer = {
			width: 5,
			// HACK: For unknown reasons, the resizers are just a little bit taller than the other elements,
			// making the whole window scroll vertically. So we remove 10 extra pixels here.
			height: rowHeight - 10,
			display: 'inline-block',
		};

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

	renderNotification(theme, styles) {
		if (!this.messageBoxVisible()) return null;

		const onViewStatusScreen = () => {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Status',
			});
		};

		const onViewEncryptionConfigScreen = () => {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Config',
				props: {
					defaultSection: 'encryption',
				},
			});
		};

		let msg = null;
		if (this.props.hasDisabledSyncItems) {
			msg = (
				<span>
					{_('Some items cannot be synchronised.')}{' '}
					<a href="#" onClick={() => onViewStatusScreen()}>
						{_('View them now')}
					</a>
				</span>
			);
		} else if (this.props.hasDisabledEncryptionItems) {
			msg = (
				<span>
					{_('Some items cannot be decrypted.')}{' '}
					<a href="#" onClick={() => onViewStatusScreen()}>
						{_('View them now')}
					</a>
				</span>
			);
		} else if (this.props.showMissingMasterKeyMessage) {
			msg = (
				<span>
					{_('One or more master keys need a password.')}{' '}
					<a href="#" onClick={() => onViewEncryptionConfigScreen()}>
						{_('Set the password')}
					</a>
				</span>
			);
		} else if (this.props.showNeedUpgradingMasterKeyMessage) {
			msg = (
				<span>
					{_('One of your master keys use an obsolete encryption method.')}{' '}
					<a href="#" onClick={() => onViewEncryptionConfigScreen()}>
						{_('View them now')}
					</a>
				</span>
			);
		} else if (this.props.showShouldReencryptMessage) {
			msg = (
				<span>
					{_('The default encryption method has been changed, you should reencrypt your data.')}{' '}
					<a href="#" onClick={() => onViewEncryptionConfigScreen()}>
						{_('More info')}
					</a>
				</span>
			);
		}

		return (
			<div style={styles.messageBox}>
				<span style={theme.textStyle}>{msg}</span>
			</div>
		);
	}

	messageBoxVisible() {
		return this.props.hasDisabledSyncItems || this.props.showMissingMasterKeyMessage || this.props.showNeedUpgradingMasterKeyMessage || this.props.showShouldReencryptMessage || this.props.hasDisabledEncryptionItems;
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
		const sidebarVisibility = this.props.sidebarVisibility;
		const noteListVisibility = this.props.noteListVisibility;
		const styles = this.styles(this.props.theme, style.width, style.height, this.messageBoxVisible(), sidebarVisibility, noteListVisibility, this.props.sidebarWidth, this.props.noteListWidth);
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

		const messageComp = this.renderNotification(theme, styles);

		const dialogInfo = PluginManager.instance().pluginDialogToShow(this.props.plugins);
		const pluginDialog = !dialogInfo ? null : <dialogInfo.Dialog {...dialogInfo.props} />;

		const modalLayerStyle = Object.assign({}, styles.modalLayer, { display: this.state.modalLayer.visible ? 'block' : 'none' });

		const notePropertiesDialogOptions = this.state.notePropertiesDialogOptions;
		const noteContentPropertiesDialogOptions = this.state.noteContentPropertiesDialogOptions;
		const shareNoteDialogOptions = this.state.shareNoteDialogOptions;
		const keyboardMode = Setting.value('editor.keyboardMode');

		const isWYSIWYG = this.props.noteVisiblePanes.length && this.props.noteVisiblePanes[0] === 'wysiwyg';
		const noteTextComp = isWYSIWYG ?
			<NoteText2 editor="TinyMCE" style={styles.noteText} keyboardMode={keyboardMode} visiblePanes={this.props.noteVisiblePanes} />
			:
			<NoteText style={styles.noteText} keyboardMode={keyboardMode} visiblePanes={this.props.noteVisiblePanes} />;

		return (
			<div style={style}>
				<div style={modalLayerStyle}>{this.state.modalLayer.message}</div>

				{noteContentPropertiesDialogOptions.visible && <NoteContentPropertiesDialog theme={this.props.theme} onClose={this.noteContentPropertiesDialog_close} text={noteContentPropertiesDialogOptions.text} lines={noteContentPropertiesDialogOptions.lines}/>}
				{notePropertiesDialogOptions.visible && <NotePropertiesDialog theme={this.props.theme} noteId={notePropertiesDialogOptions.noteId} onClose={this.notePropertiesDialog_close} onRevisionLinkClick={notePropertiesDialogOptions.onRevisionLinkClick} />}
				{shareNoteDialogOptions.visible && <ShareNoteDialog theme={this.props.theme} noteIds={shareNoteDialogOptions.noteIds} onClose={this.shareNoteDialog_close} />}

				<PromptDialog autocomplete={promptOptions && 'autocomplete' in promptOptions ? promptOptions.autocomplete : null} defaultValue={promptOptions && promptOptions.value ? promptOptions.value : ''} theme={this.props.theme} style={styles.prompt} onClose={this.promptOnClose_} label={promptOptions ? promptOptions.label : ''} description={promptOptions ? promptOptions.description : null} visible={!!this.state.promptOptions} buttons={promptOptions && 'buttons' in promptOptions ? promptOptions.buttons : null} inputType={promptOptions && 'inputType' in promptOptions ? promptOptions.inputType : null} />

				<Header style={styles.header} showBackButton={false} items={headerItems} />
				{messageComp}
				<SideBar style={styles.sideBar} />
				<VerticalResizer style={styles.verticalResizer} onDrag={this.sidebar_onDrag} />
				<NoteList style={styles.noteList} />
				<VerticalResizer style={styles.verticalResizer} onDrag={this.noteList_onDrag} />
				{noteTextComp}
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
		hasDisabledEncryptionItems: state.hasDisabledEncryptionItems,
		showMissingMasterKeyMessage: state.notLoadedMasterKeys.length && state.masterKeys.length,
		showNeedUpgradingMasterKeyMessage: !!EncryptionService.instance().masterKeysThatNeedUpgrading(state.masterKeys).length,
		showShouldReencryptMessage: state.settings['encryption.shouldReencrypt'] >= Setting.SHOULD_REENCRYPT_YES,
		selectedFolderId: state.selectedFolderId,
		sidebarWidth: state.settings['style.sidebar.width'],
		noteListWidth: state.settings['style.noteList.width'],
		selectedNoteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null,
		plugins: state.plugins,
		templates: state.templates,
	};
};

const MainScreen = connect(mapStateToProps)(MainScreenComponent);

module.exports = { MainScreen };
