import { Logger } from 'lib/logger.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { cliUtils } from './cli-utils.js';
import { reducer, defaultState } from 'lib/reducer.js';

const tk = require('terminal-kit');
const termutils = require('tkwidgets/framework/termutils.js');
const Renderer = require('tkwidgets/framework/Renderer.js');

const BaseWidget = require('tkwidgets/BaseWidget.js');
const ListWidget = require('tkwidgets/ListWidget.js');
const TextWidget = require('tkwidgets/TextWidget.js');
const ConsoleWidget = require('tkwidgets/ConsoleWidget.js');
const HLayoutWidget = require('tkwidgets/HLayoutWidget.js');
const VLayoutWidget = require('tkwidgets/VLayoutWidget.js');
const ReduxRootWidget = require('tkwidgets/ReduxRootWidget.js');
const RootWidget = require('tkwidgets/RootWidget.js');
const WindowWidget = require('tkwidgets/WindowWidget.js');

const NoteWidget = require('./gui/NoteWidget.js');
const FolderListWidget = require('./gui/FolderListWidget.js');

class AppGui {

	constructor(app, store) {
		this.app_ = app;
		this.store_ = store;

		BaseWidget.setLogger(app.logger());

		this.term_ = tk.terminal;
		this.renderer_ = null;
		this.logger_ = new Logger();
		this.buildUi();

		this.renderer_ = new Renderer(this.term(), this.rootWidget_);

		this.renderer_.on('renderDone', async (event) => {
			if (this.widget('console').hasFocus()) this.widget('console').resetCursor();
		});

		this.app_.on('modelAction', async (event) => {
			await this.handleModelAction(event.action);
		});

		this.shortcuts_ = this.setupShortcuts();
	}

	buildUi() {
		this.rootWidget_ = new ReduxRootWidget(this.store_);
		this.rootWidget_.name = 'rootWidget';

		const folderList = new FolderListWidget();
		folderList.setStyle({ borderBottomWidth: 1 });
		folderList.name = 'folderList';
		folderList.setVStretch(true);
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

		const noteList = new ListWidget();
		noteList.items = [];
		noteList.setItemRenderer((note) => {
			let label = note.title;
			if (note.is_todo) {
				label = '[' + (note.todo_completed ? 'X' : ' ') + '] ' + label;
			}
			return label;
		});
		noteList.name = 'noteList';
		noteList.setVStretch(true);
		noteList.setStyle({
			borderBottomWidth: 1,
			borderLeftWidth: 1,
			borderRightWidth: 1,
		});
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
		noteText.setVStretch(true);
		noteText.name = 'noteText';
		noteText.setStyle({ borderBottomWidth: 1 });
		this.rootWidget_.connect(noteText, (state) => {
			return { noteId: state.selectedNoteId };
		});

		const consoleWidget = new ConsoleWidget();
		consoleWidget.setHStretch(true);
		consoleWidget.name = 'console';
		consoleWidget.on('accept', (event) => {
			this.processCommand(event.input, 'console');
		});

		const hLayout = new HLayoutWidget();
		hLayout.name = 'hLayout';
		hLayout.addChild(folderList, { type: 'stretch', factor: 1 });
		hLayout.addChild(noteList, { type: 'stretch', factor: 1 });
		hLayout.addChild(noteText, { type: 'stretch', factor: 1 });

		const vLayout = new VLayoutWidget();
		vLayout.name = 'vLayout';
		vLayout.addChild(hLayout, { type: 'stretch', factor: 1 });
		vLayout.addChild(consoleWidget, { type: 'fixed', factor: 5 });

		const win1 = new WindowWidget();
		win1.addChild(vLayout);
		win1.name = 'mainWindow';

		this.rootWidget_.addChild(win1);
	}

	setupShortcuts() {
		const shortcuts = {};

		const consoleWidget = this.widget('console');

		shortcuts['DELETE'] = 'rm $n';

		shortcuts[' '] = 'todo toggle $n';

		shortcuts['c'] = () => {
			consoleWidget.focus();
		}

		shortcuts['ENTER'] = () => {
			const w = this.widget('mainWindow').focusedWidget();
			if (w.name == 'folderList') {
				this.widget('noteList').focus();
			} else if (w.name == 'noteList') {
				this.processCommand('edit $n');
			}
		}

		shortcuts[':nn'] = () => {
			consoleWidget.focus('mknote ');
		}

		shortcuts[':nt'] = () => {
			consoleWidget.focus('mktodo ');
		}

		shortcuts[':nb'] = () => {
			consoleWidget.focus('mkbook ');
		}

		return shortcuts;
	}

	widget(name) {
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

	term() {
		return this.term_;
	}

	activeListItem() {
		const widget = this.widget('mainWindow').focusedWidget();
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

		const consoleWidget = this.widget('console');

		if (cmd === ':m') {
			if (consoleWidget.isMaximized__ === undefined) {
				consoleWidget.isMaximized__ = false;
			}

			let constraints = {
				type: 'fixed',
				factor: consoleWidget.isMaximized__ ? 5 : this.widget('vLayout').height() - 4,
			};

			consoleWidget.isMaximized__ = !consoleWidget.isMaximized__;

			this.widget('vLayout').setWidgetConstraints(consoleWidget, constraints);

			return;
		} else if (cmd[0] === ':') {
			if (this.shortcuts_[cmd]) {
				this.shortcuts_[cmd]();
				return;				
			}
		}

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
			consoleWidget.bufferPush(error.message);
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

	async start() {
		const term = this.term();

		term.fullscreen();
		termutils.hideCursor(term);

		try {
			this.renderer_.start();

			const consoleWidget = this.widget('console');

			term.grabInput();

			term.on('key', async (name, matches, data) => {
				if (name === 'CTRL_C' ) {
					termutils.showCursor(term);
					term.fullscreen(false);
					process.exit();
					return;
				}

				if (!consoleWidget.hasFocus()) {
					if (name == ':') {
						consoleWidget.focus(':');
					} else if (name in this.shortcuts_) {
						const cmd = this.shortcuts_[name];
						if (typeof cmd === 'function') {
							cmd();
						} else {
							consoleWidget.bufferPush(cmd);
							await this.processCommand(cmd);
						}
					}
				}
			});
		} catch (error) {
			this.logger().error(error);
			term.fullscreen(false);
			termutils.showCursor(term);
			console.error(error);
		}

		process.on('unhandledRejection', (reason, p) => {
			term.fullscreen(false);
			termutils.showCursor(term);
			console.error('Unhandled promise rejection', p, 'reason:', reason);
			process.exit(1);
		});
	}

}

module.exports = AppGui;