const { Logger } = require('lib/logger.js');
const { Folder } = require('lib/models/folder.js');
const { Tag } = require('lib/models/tag.js');
const { BaseModel } = require('lib/base-model.js');
const { Note } = require('lib/models/note.js');
const { Resource } = require('lib/models/resource.js');
const { cliUtils } = require('./cli-utils.js');
const { reducer, defaultState } = require('lib/reducer.js');
const { splitCommandString } = require('lib/string-utils.js');
const { reg } = require('lib/registry.js');
const { _ } = require('lib/locale.js');

const chalk = require('chalk');
const tk = require('terminal-kit');
const TermWrapper = require('tkwidgets/framework/TermWrapper.js');
const Renderer = require('tkwidgets/framework/Renderer.js');

const BaseWidget = require('tkwidgets/BaseWidget.js');
const ListWidget = require('tkwidgets/ListWidget.js');
const TextWidget = require('tkwidgets/TextWidget.js');
const HLayoutWidget = require('tkwidgets/HLayoutWidget.js');
const VLayoutWidget = require('tkwidgets/VLayoutWidget.js');
const ReduxRootWidget = require('tkwidgets/ReduxRootWidget.js');
const RootWidget = require('tkwidgets/RootWidget.js');
const WindowWidget = require('tkwidgets/WindowWidget.js');

const NoteWidget = require('./gui/NoteWidget.js');
const ResourceServer = require('./ResourceServer.js');
const NoteMetadataWidget = require('./gui/NoteMetadataWidget.js');
const FolderListWidget = require('./gui/FolderListWidget.js');
const NoteListWidget = require('./gui/NoteListWidget.js');
const StatusBarWidget = require('./gui/StatusBarWidget.js');
const ConsoleWidget = require('./gui/ConsoleWidget.js');

class AppGui {

	constructor(app, store) {
		this.app_ = app;
		this.store_ = store;

		BaseWidget.setLogger(app.logger());

		this.term_ = new TermWrapper(tk.terminal);

		this.renderer_ = null;
		this.logger_ = new Logger();
		this.buildUi();

		this.renderer_ = new Renderer(this.term(), this.rootWidget_);

		this.app_.on('modelAction', async (event) => {
			await this.handleModelAction(event.action);
		});

		this.shortcuts_ = this.setupShortcuts();

		this.inputMode_ = AppGui.INPUT_MODE_NORMAL;

		this.commandCancelCalled_ = false;

		this.currentShortcutKeys_ = [];
		this.lastShortcutKeyTime_ = 0;

		// Recurrent sync is setup only when the GUI is started. In
		// a regular command it's not necessary since the process
		// exits right away.
		reg.setupRecurrentSync();
	}

	store() {
		return this.store_;
	}

	renderer() {
		return this.renderer_;
	}

	async forceRender() {
		this.widget('root').invalidate();
		await this.renderer_.renderRoot();
	}

	prompt(initialText = '', promptString = ':') {
		return this.widget('statusBar').prompt(initialText, promptString);
	}

	stdoutMaxWidth() {
		return this.widget('console').innerWidth - 1;
	}

	isDummy() {
		return false;
	}

	buildUi() {
		this.rootWidget_ = new ReduxRootWidget(this.store_);
		this.rootWidget_.name = 'root';

		const folderList = new FolderListWidget();
		folderList.style = {
			borderBottomWidth: 1,
			borderRightWidth: 1,
		};
		folderList.name = 'folderList';
		folderList.vStretch = true;
		folderList.on('currentItemChange', async (event) => {
			const item = folderList.currentItem;

			if (item === '-') {
				let newIndex = event.currentIndex + (event.previousIndex < event.currentIndex ? +1 : -1);
				let nextItem = folderList.itemAt(newIndex);
				if (!nextItem) nextItem = folderList.itemAt(event.previousIndex);

				if (!nextItem) return; // Normally not possible

				let actionType = 'FOLDER_SELECT';
				if (nextItem.type_ === BaseModel.TYPE_TAG) actionType = 'TAG_SELECT';
				if (nextItem.type_ === BaseModel.TYPE_SEARCH) actionType = 'SEARCH_SELECT';

				this.store_.dispatch({
					type: actionType,
					id: nextItem.id,
				});
			} else if (item.type_ === Folder.modelType()) {
				this.store_.dispatch({
					type: 'FOLDER_SELECT',
					id: item ? item.id : null,
				});
			} else if (item.type_ === Tag.modelType()) {
				this.store_.dispatch({
					type: 'TAG_SELECT',
					id: item ? item.id : null,
				});
			} else if (item.type_ === BaseModel.TYPE_SEARCH) {
				this.store_.dispatch({
					type: 'SEARCH_SELECT',
					id: item ? item.id : null,
				});
			}
		});
		this.rootWidget_.connect(folderList, (state) => {
			return {
				selectedFolderId: state.selectedFolderId,
				selectedTagId: state.selectedTagId,
				selectedSearchId: state.selectedSearchId,
				notesParentType: state.notesParentType,
				folders: state.folders,
				tags: state.tags,
				searches: state.searches,
			};
		});

		const noteList = new NoteListWidget();
		noteList.name = 'noteList';
		noteList.vStretch = true;
		noteList.style = {
			borderBottomWidth: 1,
			borderLeftWidth: 1,
			borderRightWidth: 1,
		};
		noteList.on('currentItemChange', async () => {
			let note = noteList.currentItem;
			this.store_.dispatch({
				type: 'NOTE_SELECT',
				id: note ? note.id : null,
			});
		});
		this.rootWidget_.connect(noteList, (state) => {
			return {
				selectedNoteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
				items: state.notes,
			};
		});

		const noteText = new NoteWidget();
		noteText.hStretch = true;
		noteText.name = 'noteText';
		noteText.style = {
			borderBottomWidth: 1,
			borderLeftWidth: 1,
		};
		this.rootWidget_.connect(noteText, (state) => {
			return {
				noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
				notes: state.notes,
			};
		});

		const noteMetadata = new NoteMetadataWidget();
		noteMetadata.hStretch = true;
		noteMetadata.name = 'noteMetadata';
		noteMetadata.style = {
			borderBottomWidth: 1,
			borderLeftWidth: 1,
			borderRightWidth: 1,
		};
		this.rootWidget_.connect(noteMetadata, (state) => {
			return { noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null };
		});
		noteMetadata.hide();

		const consoleWidget = new ConsoleWidget();
		consoleWidget.hStretch = true;
		consoleWidget.style = {
			borderBottomWidth: 1,
		};
		consoleWidget.hide();

		const statusBar = new StatusBarWidget();
		statusBar.hStretch = true;

		const noteLayout = new VLayoutWidget();
		noteLayout.name = 'noteLayout';
		noteLayout.addChild(noteText, { type: 'stretch', factor: 1 });
		noteLayout.addChild(noteMetadata, { type: 'stretch', factor: 1 });

		const hLayout = new HLayoutWidget();
		hLayout.name = 'hLayout';
		hLayout.addChild(folderList, { type: 'stretch', factor: 1 });
		hLayout.addChild(noteList, { type: 'stretch', factor: 1 });
		hLayout.addChild(noteLayout, { type: 'stretch', factor: 2 });

		const vLayout = new VLayoutWidget();
		vLayout.name = 'vLayout';
		vLayout.addChild(hLayout, { type: 'stretch', factor: 2 });
		vLayout.addChild(consoleWidget, { type: 'stretch', factor: 1 });
		vLayout.addChild(statusBar, { type: 'fixed', factor: 1 });

		const win1 = new WindowWidget();
		win1.addChild(vLayout);
		win1.name = 'mainWindow';

		this.rootWidget_.addChild(win1);
	}

	showModalOverlay(text) {
		if (!this.widget('overlayWindow')) {
			const textWidget = new TextWidget();
			textWidget.hStretch = true;
			textWidget.vStretch = true;
			textWidget.text = 'testing';
			textWidget.name = 'overlayText';

			const win = new WindowWidget();
			win.name = 'overlayWindow';
			win.addChild(textWidget);

			this.rootWidget_.addChild(win);
		}

		this.widget('overlayWindow').activate();
		this.widget('overlayText').text = text;
	}

	hideModalOverlay() {
		if (this.widget('overlayWindow')) this.widget('overlayWindow').hide();
		this.widget('mainWindow').activate();
	}

	addCommandToConsole(cmd) {
		if (!cmd) return;
		this.stdout(chalk.cyan.bold('> ' + cmd));	
	}

	setupShortcuts() {
		const shortcuts = {};

		shortcuts['TAB'] = {
			friendlyName: 'Tab',
			description: () => _('Give focus to next pane'),
			isDocOnly: true,
		}

		shortcuts['SHIFT_TAB'] = {
			friendlyName: 'Shift+Tab',
			description: () => _('Give focus to previous pane'),
			isDocOnly: true,
		}

		shortcuts[':'] = {
			description: () => _('Enter command line mode'),
			action: async () => {
				const cmd = await this.widget('statusBar').prompt();
				if (!cmd) return;
				this.addCommandToConsole(cmd);
				await this.processCommand(cmd);
			},
		};

		shortcuts['ESC'] = { // Built into terminal-kit inputField
			description: () => _('Exit command line mode'),
			isDocOnly: true,
		};

		shortcuts['ENTER'] = {
			description: () => _('Edit the selected note'),
			action: () => {
				const w = this.widget('mainWindow').focusedWidget;
				if (w.name === 'folderList') {
					this.widget('noteList').focus();
				} else if (w.name === 'noteList' || w.name === 'noteText') {
					this.processCommand('edit $n');
				}
			},
		}

		shortcuts['CTRL_C'] = {
			description: () => _('Cancel the current command.'),
			friendlyName: 'Ctrl+C',
			isDocOnly: true,
		}

		shortcuts['CTRL_D'] = {
			description: () => _('Exit the application.'),
			friendlyName: 'Ctrl+D',
			isDocOnly: true,
		}

		shortcuts['DELETE'] = {
			description: () => _('Delete the currently selected note or notebook.'),
			action: async () => {
				if (this.widget('folderList').hasFocus) {
					const item = this.widget('folderList').selectedJoplinItem;
					if (item.type_ === BaseModel.TYPE_FOLDER) {
						await this.processCommand('rmbook ' + item.id);
					} else if (item.type_ === BaseModel.TYPE_TAG) {
						this.stdout(_('To delete a tag, untag the associated notes.'));
					} else if (item.type_ === BaseModel.TYPE_SEARCH) {
						this.store().dispatch({
							type: 'SEARCH_DELETE',
							id: item.id,
						});
					}
				} else if (this.widget('noteList').hasFocus) {
					await this.processCommand('rmnote $n');
				} else {
					this.stdout(_('Please select the note or notebook to be deleted first.'));
				}
			}
		};

		shortcuts[' '] = {
			friendlyName: 'SPACE',
			description: () => _('Set a to-do as completed / not completed'),
			action: 'todo toggle $n',
		}

		shortcuts['tc'] = {
			description: () => _('[t]oggle [c]onsole between maximized/minimized/hidden/visible.'),
			action: () => {
				if (!this.consoleIsShown()) {
					this.showConsole();
					this.minimizeConsole();
				} else {
					if (this.consoleIsMaximized()) {
						this.hideConsole();
					} else {
						this.maximizeConsole();
					}
				}
			},
			canRunAlongOtherCommands: true,
		}

		shortcuts['/'] = {
			description: () => _('Search'),
			action: { type: 'prompt', initialText: 'search ""', cursorPosition: -2 },
		};

		shortcuts['tm'] = {
			description: () => _('[t]oggle note [m]etadata.'),
			action: () => {
				this.toggleNoteMetadata();
			},
			canRunAlongOtherCommands: true,
		}

		shortcuts['mn'] = {
			description: () => _('[M]ake a new [n]ote'),
			action: { type: 'prompt', initialText: 'mknote ""', cursorPosition: -2 },
		}

		shortcuts['mt'] = {
			description: () => _('[M]ake a new [t]odo'),
			action: { type: 'prompt', initialText: 'mktodo ""', cursorPosition: -2 },
		}

		shortcuts['mb'] = {
			description: () => _('[M]ake a new note[b]ook'),
			action: { type: 'prompt', initialText: 'mkbook ""', cursorPosition: -2 },
		}

		shortcuts['yn'] = {
			description: () => _('Copy ([Y]ank) the [n]ote to a notebook.'),
			action: { type: 'prompt', initialText: 'cp $n ""', cursorPosition: -2 },
		}

		shortcuts['dn'] = {
			description: () => _('Move the note to a notebook.'),
			action: { type: 'prompt', initialText: 'mv $n ""', cursorPosition: -2 },
		}

		return shortcuts;
	}

	toggleConsole() {
		this.showConsole(!this.consoleIsShown());
	}

	showConsole(doShow = true) {
		this.widget('console').show(doShow);
	}

	hideConsole() {
		this.showConsole(false);
	}

	consoleIsShown() {
		return this.widget('console').shown;
	}

	maximizeConsole(doMaximize = true) {
		const consoleWidget = this.widget('console');

		if (consoleWidget.isMaximized__ === undefined) {
			consoleWidget.isMaximized__ = false;
		}

		if (consoleWidget.isMaximized__ === doMaximize) return;

		let constraints = {
			type: 'stretch',
			factor: !doMaximize ? 1 : 4,
		};

		consoleWidget.isMaximized__ = doMaximize;

		this.widget('vLayout').setWidgetConstraints(consoleWidget, constraints);
	}

	minimizeConsole() {
		this.maximizeConsole(false);
	}

	consoleIsMaximized() {
		return this.widget('console').isMaximized__ === true;
	}

	showNoteMetadata(show = true) {
		this.widget('noteMetadata').show(show);
	}

	hideNoteMetadata() {
		this.showNoteMetadata(false);
	}

	toggleNoteMetadata() {
		this.showNoteMetadata(!this.widget('noteMetadata').shown);
	}

	widget(name) {
		if (name === 'root') return this.rootWidget_;
		return this.rootWidget_.childByName(name);
	}

	app() {
		return this.app_;
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	shortcuts() {
		return this.shortcuts_;
	}

	term() {
		return this.term_;
	}

	activeListItem() {
		const widget = this.widget('mainWindow').focusedWidget;
		if (!widget) return null;
		
		if (widget.name == 'noteList' || widget.name == 'folderList') {
			return widget.currentItem;
		}

		return null;
	}

	async handleModelAction(action) {
		this.logger().info('Action:', action);

		let state = Object.assign({}, defaultState);
		state.notes = this.widget('noteList').items;

		let newState = reducer(state, action);

		if (newState !== state) {
			this.widget('noteList').items = newState.notes;
		}
	}

	async processCommand(cmd) {
		if (!cmd) return;
		cmd = cmd.trim();
		if (!cmd.length) return;

		this.logger().info('Got command: ' + cmd);

		if (cmd === 'q' || cmd === 'wq' || cmd === 'qa') { // Vim bonus
			await this.app().exit();
			return;
		}	

		let note = this.widget('noteList').currentItem;
		let folder = this.widget('folderList').currentItem;
		let args = splitCommandString(cmd);

		for (let i = 0; i < args.length; i++) {
			if (args[i] == '$n') {
				args[i] = note ? note.id : '';
			} else if (args[i] == '$b') {
				args[i] = folder ? folder.id : '';
			} else  if (args[i] == '$c') {
				const item = this.activeListItem();
				args[i] = item ? item.id : '';
			}
		}

		try {
			await this.app().execCommand(args);
		} catch (error) {
			this.stdout(error.message);
		}

		this.widget('console').scrollBottom();
	}

	async updateFolderList() {
		const folders = await Folder.all();
		this.widget('folderList').items = folders;
	}

	async updateNoteList(folderId) {
		const fields = Note.previewFields();
		fields.splice(fields.indexOf('body'), 1);
		const notes = folderId ? await Note.previews(folderId, { fields: fields }) : [];
		this.widget('noteList').items = notes;
	}

	async updateNoteText(note) {
		const text = note ? note.body : '';
		this.widget('noteText').text = text;
	}

	// Any key after which a shortcut is not possible.
	isSpecialKey(name) {
		return [':', 'ENTER', 'DOWN', 'UP', 'LEFT', 'RIGHT', 'DELETE', 'BACKSPACE', 'ESCAPE', 'TAB', 'SHIFT_TAB', 'PAGE_UP', 'PAGE_DOWN'].indexOf(name) >= 0;
	}

	fullScreen(enable = true) {
		if (enable) {
			this.term().fullscreen();
			this.term().hideCursor();
			this.widget('root').invalidate();
		} else {
			this.term().fullscreen(false);
			this.term().showCursor();
		}
	}

	stdout(text) {
		if (text === null || text === undefined) return;

		let lines = text.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const v = typeof lines[i] === 'object' ? JSON.stringify(lines[i]) : lines[i];
			this.widget('console').addLine(v);
		}

		this.updateStatusBarMessage();
	}

	exit() {
		this.fullScreen(false);
		this.resourceServer_.stop();
	}

	updateStatusBarMessage() {
		const consoleWidget = this.widget('console');

		let msg = '';

		const text = consoleWidget.lastLine;

		const cmd = this.app().currentCommand();
		if (cmd) {
			msg += cmd.name();
			if (cmd.cancellable()) msg += ' [Press Ctrl+C to cancel]';
			msg += ': ';
		}

		if (text && text.length) {
			msg += text;
		}

		if (msg !== '') this.widget('statusBar').setItemAt(0, msg);
	}

	async setupResourceServer() {
		const linkStyle = chalk.blue.underline;
		const noteTextWidget = this.widget('noteText');
		const resourceIdRegex = /^:\/[a-f0-9]+$/i
		const noteLinks = {};

		const hasProtocol = function(s, protocols) {
			if (!s) return false;
			s = s.trim().toLowerCase();
			for (let i = 0; i < protocols.length; i++) {
				if (s.indexOf(protocols[i] + '://') === 0) return true;
			}
			return false;
		}

		// By default, before the server is started, only the regular
		// URLs appear in blue.
		noteTextWidget.markdownRendererOptions = {
			linkUrlRenderer: (index, url) => {
				if (!url) return url;

				if (resourceIdRegex.test(url)) {
					return url;
				} else if (hasProtocol(url, ['http', 'https'])) {
					return linkStyle(url);
				} else {
					return url;
				}
			},
		};

		this.resourceServer_ = new ResourceServer();
		this.resourceServer_.setLogger(this.app().logger());
		this.resourceServer_.setLinkHandler(async (path, response) => {
			const link = noteLinks[path];

			if (link.type === 'url') {
				response.writeHead(302, { 'Location': link.url });
				return true;
			}

			if (link.type === 'resource') {
				const resourceId = link.id;
				let resource = await Resource.load(resourceId);
				if (!resource) throw new Error('No resource with ID ' + resourceId); // Should be nearly impossible
				if (resource.mime) response.setHeader('Content-Type', resource.mime);
				response.write(await Resource.content(resource));
				return true;
			}

			return false;
		});

		await this.resourceServer_.start();
		if (!this.resourceServer_.started()) return;

		noteTextWidget.markdownRendererOptions = {
			linkUrlRenderer: (index, url) => {
				if (!url) return url;

				if (resourceIdRegex.test(url)) {
					noteLinks[index] = {
						type: 'resource',
						id: url.substr(2),
					};					
				} else if (hasProtocol(url, ['http', 'https', 'file', 'ftp'])) {
					noteLinks[index] = {
						type: 'url',
						url: url,
					};
				} else if (url.indexOf('#') === 0) {
					return ''; // Anchors aren't supported for now
				} else {
					return url;
				}

				return linkStyle(this.resourceServer_.baseUrl() + '/' + index);
			},
		};
	}

	async start() {
		const term = this.term();

		this.fullScreen();

		try {
			this.setupResourceServer();

			this.renderer_.start();

			const statusBar = this.widget('statusBar');

			term.grabInput();

			term.on('key', async (name, matches, data) => {

				// -------------------------------------------------------------------------
				// Handle special shortcuts
				// -------------------------------------------------------------------------

				if (name === 'CTRL_D') {
					const cmd = this.app().currentCommand();

					if (cmd && cmd.cancellable() && !this.commandCancelCalled_) {
						this.commandCancelCalled_ = true;
						await cmd.cancel();
						this.commandCancelCalled_ = false;
					}

					await this.app().exit();
					return;
				}

				if (name === 'CTRL_C' ) {
					const cmd = this.app().currentCommand();
					if (!cmd || !cmd.cancellable() || this.commandCancelCalled_) {
						this.stdout(_('Press Ctrl+D or type "exit" to exit the application'));
					} else {
						this.commandCancelCalled_ = true;
						await cmd.cancel()
						this.commandCancelCalled_ = false;
					}
					return;
				}

				// -------------------------------------------------------------------------
				// Build up current shortcut
				// -------------------------------------------------------------------------
				
				const now = (new Date()).getTime();

				if (now - this.lastShortcutKeyTime_ > 800 || this.isSpecialKey(name)) {
					this.currentShortcutKeys_ = [name];
				} else {
					// If the previous key was a special key (eg. up, down arrow), this new key
					// starts a new shortcut.
					if (this.currentShortcutKeys_.length && this.isSpecialKey(this.currentShortcutKeys_[0])) {
						this.currentShortcutKeys_ = [name];
					} else {
						this.currentShortcutKeys_.push(name);
					}
				}

				this.lastShortcutKeyTime_ = now;

				// -------------------------------------------------------------------------
				// Process shortcut and execute associated command
				// -------------------------------------------------------------------------

				const shortcutKey = this.currentShortcutKeys_.join('');
				const cmd = shortcutKey in this.shortcuts_ ? this.shortcuts_[shortcutKey] : null;

				let processShortcutKeys = !this.app().currentCommand() && cmd;
				if (cmd && cmd.canRunAlongOtherCommands) processShortcutKeys = true;
				if (statusBar.promptActive) processShortcutKeys = false;
				if (cmd && cmd.isDocOnly) processShortcutKeys = false;

				if (processShortcutKeys) {
					this.logger().info('Shortcut:', shortcutKey, cmd.description());

					this.currentShortcutKeys_ = [];
					if (typeof cmd.action === 'function') {
						await cmd.action();
					} else if (typeof cmd.action === 'object') {
						if (cmd.action.type === 'prompt') {
							let promptOptions = {};
							if ('cursorPosition' in cmd.action) promptOptions.cursorPosition = cmd.action.cursorPosition;
							const commandString = await statusBar.prompt(cmd.action.initialText ? cmd.action.initialText : '', null, promptOptions);
							this.addCommandToConsole(commandString);
							await this.processCommand(commandString);
						} else {
							throw new Error('Unknown command: ' + JSON.stringify(cmd.action));
						}
					} else { // String
						this.stdout(cmd.action);
						await this.processCommand(cmd.action);
					}
				}

				// Optimisation: Update the status bar only
				// if the user is not already typing a command:
				if (!statusBar.promptActive) this.updateStatusBarMessage();
			});
		} catch (error) {
			this.fullScreen(false);
			this.logger().error(error);
			console.error(error);
		}

		process.on('unhandledRejection', (reason, p) => {
			this.fullScreen(false);
			console.error('Unhandled promise rejection', p, 'reason:', reason);
			process.exit(1);
		});
	}

}

AppGui.INPUT_MODE_NORMAL = 1;
AppGui.INPUT_MODE_META = 2;

module.exports = AppGui;