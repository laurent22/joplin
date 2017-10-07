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
const RootWidget = require('tkwidgets/RootWidget.js');
const WindowWidget = require('tkwidgets/WindowWidget.js');

class AppGui {

	constructor(app) {
		this.app_ = app;

		BaseWidget.setLogger(app.logger());

		this.term_ = tk.terminal;
		this.renderer_ = null;
		this.logger_ = new Logger();
		this.rootWidget_ = this.buildUi();
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
		const rootWidget = new RootWidget();
		rootWidget.setName('rootWidget');

		const folderList = new ListWidget();
		folderList.items = [];
		folderList.setItemRenderer((item) => {
			return item.title;
		});
		folderList.setStyle({
			borderBottomWidth: 1,
		});
		folderList.setName('folderList');
		folderList.setVStretch(true);
		folderList.on('currentItemChange', async () => {
			const folder = folderList.currentItem;
			this.app().switchCurrentFolder(folder);
			await this.updateNoteList(folder ? folder.id : null);
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
		noteList.setName('noteList');
		noteList.setVStretch(true);
		noteList.setStyle({
			borderBottomWidth: 1,
			borderLeftWidth: 1,
			borderRightWidth: 1,
		});
		noteList.on('currentItemChange', async () => {
			let note = noteList.currentItem;
			if (note) {
				if (!('body' in note)) {
					note = await Note.load(note.id);
				}
				noteList.setCurrentItem(note);
			}
			await this.updateNoteText(note);
		});

		const noteText = new TextWidget();
		noteText.setVStretch(true);
		noteText.setName('noteText');
		noteText.setStyle({
			borderBottomWidth: 1,
		});

		const consoleWidget = new ConsoleWidget();
		consoleWidget.setHStretch(true);
		consoleWidget.setName('console');
		consoleWidget.on('accept', (event) => {
			this.processCommand(event.input);
		});

		const hLayout = new HLayoutWidget();
		hLayout.setName('hLayout');
		hLayout.addChild(folderList, { type: 'stretch', factor: 1 });
		hLayout.addChild(noteList, { type: 'stretch', factor: 1 });
		hLayout.addChild(noteText, { type: 'stretch', factor: 1 });

		const vLayout = new VLayoutWidget();
		vLayout.setName('vLayout');
		vLayout.addChild(hLayout, { type: 'stretch', factor: 1 });
		vLayout.addChild(consoleWidget, { type: 'fixed', factor: 5 });

		const win1 = new WindowWidget();
		win1.addChild(vLayout);
		win1.setName('mainWindow');

		rootWidget.addChild(win1);

		return rootWidget;
	}

	setupShortcuts() {
		const shortcuts = {};

		shortcuts['DELETE'] = 'rm $n';
		shortcuts['t'] = 'todo toggle $n';
		shortcuts['c'] = () => { this.widget('console').focus(); };
		shortcuts[' '] = 'edit $n';

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
		
		if (widget.name() == 'noteList' || widget.name() == 'folderList') {
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

		const metaCmd = cmd.substr(0, 2);
		
		if (metaCmd === ':m') {
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
		}

		let note = this.widget('noteList').currentItem;
		let folder = this.widget('folderList').currentItem;
		let args = cliUtils.splitCommandString(cmd);

		for (let i = 0; i < args.length; i++) {
			if (note && args[i] == '$n') {
				args[i] = note.id;
			} else if (folder && args[i] == '$b') {
				args[i] = folder.id;
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

			await this.updateFolderList();

			term.grabInput();

			term.on('key', async (name, matches, data) => {
				if (name === 'CTRL_C' ) {
					termutils.showCursor(term);
					term.fullscreen(false);
					process.exit();
					return;
				}

				if (!consoleWidget.hasFocus()) {
					if (name in this.shortcuts_) {
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
	}

}

module.exports = AppGui;