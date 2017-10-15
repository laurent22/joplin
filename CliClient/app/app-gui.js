import { Logger } from 'lib/logger.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { cliUtils } from './cli-utils.js';
import { reducer, defaultState } from 'lib/reducer.js';
import { _ } from 'lib/locale.js';

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

		this.renderer_.on('renderDone', async (event) => {
			//if (this.widget('console').hasFocus) this.widget('console').resetCursor();
		});

		this.app_.on('modelAction', async (event) => {
			await this.handleModelAction(event.action);
		});

		this.shortcuts_ = this.setupShortcuts();

		this.inputMode_ = AppGui.INPUT_MODE_NORMAL;

		this.commandCancelCalled_ = false;

		this.currentShortcutKeys_ = [];
		this.lastShortcutKeyTime_ = 0;	

		cliUtils.setStdout((...object) => {
			return this.stdout(...object);

			// for (let i = 0; i < object.length; i++) {
			// 	this.widget('console').bufferPush(object[i]);
			// }
		});
	}

	renderer() {
		return this.renderer_;
	}

	async forceRender() {
		this.widget('root').invalidate();
		await this.renderer_.renderRoot();
	}

	buildUi() {
		this.rootWidget_ = new ReduxRootWidget(this.store_);
		this.rootWidget_.name = 'root';

		const folderList = new FolderListWidget();
		folderList.style = { borderBottomWidth: 1 };
		folderList.name = 'folderList';
		folderList.vStretch = true;
		folderList.on('currentItemChange', async () => {
			const folder = folderList.currentItem;
			this.store_.dispatch({
				type: 'FOLDERS_SELECT',
				folderId: folder ? folder.id : 0,
			});
		});
		this.rootWidget_.connect(folderList, (state) => {
			return {
				selectedFolderId: state.selectedFolderId,
				items: state.folders,
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
				type: 'NOTES_SELECT',
				noteId: note ? note.id : 0,
			});
		});
		this.rootWidget_.connect(noteList, (state) => {
			return {
				selectedNoteId: state.selectedNoteId,
				items: state.notes,
			};
		});

		const noteText = new NoteWidget();
		noteText.vStretch = true;
		noteText.name = 'noteText';
		noteText.style = { borderBottomWidth: 1 };
		this.rootWidget_.connect(noteText, (state) => {
			return { noteId: state.selectedNoteId };
		});

		const consoleWidget = new ConsoleWidget();
		consoleWidget.hStretch = true;

		const statusBar = new StatusBarWidget();
		statusBar.hStretch = true;

		const hLayout = new HLayoutWidget();
		hLayout.name = 'hLayout';
		hLayout.addChild(folderList, { type: 'stretch', factor: 1 });
		hLayout.addChild(noteList, { type: 'stretch', factor: 1 });
		hLayout.addChild(noteText, { type: 'stretch', factor: 2 });

		const vLayout = new VLayoutWidget();
		vLayout.name = 'vLayout';
		vLayout.addChild(hLayout, { type: 'stretch', factor: 1 });
		vLayout.addChild(consoleWidget, { type: 'fixed', factor: 3 });
		vLayout.addChild(statusBar, { type: 'fixed', factor: 1 });

		const win1 = new WindowWidget();
		win1.addChild(vLayout);
		win1.name = 'mainWindow';

		this.rootWidget_.addChild(win1);
	}

	setupShortcuts() {
		const shortcuts = {};

		shortcuts['DELETE'] = {
			description: _('Delete a note'),
			action: 'rm $n',
		};

		shortcuts[' '] = {
			friendlyName: 'SPACE',
			description: _('Set a todo as completed / not completed'),
			action: 'todo toggle $n',
		}

		shortcuts[':'] = {
			description: _('Enter the console'),
			isDocOnly: true,
		};

		shortcuts['ESC'] = {
			description: _('Exit the console'),
			isDocOnly: true,
		};

		shortcuts['ENTER'] = {
			description: null,
			action: () => {
				const w = this.widget('mainWindow').focusedWidget;
				if (w.name == 'folderList') {
					this.widget('noteList').focus();
				} else if (w.name == 'noteList') {
					this.processCommand('edit $n');
				}
			},
		}

		shortcuts['nn'] = {
			description: _('Create a new note'),
			action: { type: 'prompt', initialText: 'mknote ' },
		}

		shortcuts['nt'] = {
			description: _('Create a new todo'),
			action: { type: 'prompt', initialText: 'mktodo ' },
		}

		shortcuts['nb'] = {
			description: _('Create a new notebook'),
			action: { type: 'prompt', initialText: 'mkbook ' },
		}

		shortcuts['CTRL_JCTRL_Z'] = {
			friendlyName: 'Ctrl+J Ctrl+Z',
			description: _('Maximise/minimise the console'),
			action: () => { this.toggleMaximizeConsole(); },
		}

		return shortcuts;
	}

	toggleMaximizeConsole() {
		this.maximizeConsole(!this.consoleIsMaximized());
	}

	maximizeConsole(doMaximize = true) {
		// const consoleWidget = this.widget('console');

		// if (consoleWidget.isMaximized__ === undefined) {
		// 	consoleWidget.isMaximized__ = false;
		// }

		// if (consoleWidget.isMaximized__ === doMaximize) return;

		// let constraints = {
		// 	type: 'fixed',
		// 	factor: !doMaximize ? 5 : this.widget('vLayout').height - 4,
		// };

		// consoleWidget.isMaximized__ = doMaximize;

		// this.widget('vLayout').setWidgetConstraints(consoleWidget, constraints);
	}

	minimizeConsole() {
		//this.maximizeConsole(false);
	}

	consoleIsMaximized() {
		return false;

		//return this.widget('console').isMaximized__ === true;
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

		let note = this.widget('noteList').currentItem;
		let folder = this.widget('folderList').currentItem;
		let args = cliUtils.splitCommandString(cmd);

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

	stdout(...object) {
		for (let i = 0; i < object.length; i++) {
			const v = typeof object[i] === 'object' ? JSON.stringify(object[i]) : object[i];
			this.widget('console').addItem(v);
		}

		this.updateStatusBarMessage();
	}

	updateStatusBarMessage() {
		const consoleWidget = this.widget('console');

		let msg = '';

		const text = consoleWidget.items.length ? consoleWidget.items[consoleWidget.items.length - 1] : '';

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

	async start() {
		const term = this.term();

		this.fullScreen();

		try {
			this.renderer_.start();

			const statusBar = this.widget('statusBar');

			term.grabInput();

			term.on('key', async (name, matches, data) => {

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
						await cmd.cancel();
						this.commandCancelCalled_ = false;
					}
					return;
				}
				
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

				if (!this.app().currentCommand()) {
					if (name === ':' && !statusBar.promptActive) {
						const cmd = await statusBar.prompt();
						await this.processCommand(cmd);
					} else {
						// Don't process shortcut keys if the console is active, except if the shortcut
						// starts with CTRL (eg. CTRL+J CTRL+Z to maximize the console window).
						if (!statusBar.promptActive || (this.currentShortcutKeys_.length && this.currentShortcutKeys_[0].indexOf('CTRL') === 0)) {
							this.logger().debug('Now: ' + name + ', Keys: ', this.currentShortcutKeys_);

							const shortcutKey = this.currentShortcutKeys_.join('');
							if (shortcutKey in this.shortcuts_) {
								const cmd = this.shortcuts_[shortcutKey].action;
								if (!cmd.isDocOnly) {
									this.currentShortcutKeys_ = [];
									if (typeof cmd === 'function') {
										await cmd();
									} else if (typeof cmd === 'object') {
										if (cmd.type === 'prompt') {
											const commandString = await statusBar.prompt(cmd.initialText ? cmd.initialText : '');
											this.stdout(commandString);
											await this.processCommand(commandString);
										} else {
											throw new Error('Unknown command: ' + JSON.stringify(cmd));
										}
									} else {
										this.stdout(cmd);
										await this.processCommand(cmd);
									}
								}
							}
						}
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