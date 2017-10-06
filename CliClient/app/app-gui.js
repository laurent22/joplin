import { Logger } from 'lib/logger.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { cliUtils } from './cli-utils.js';

const tk = require('terminal-kit');
const termutils = require('tkwidgets/framework/termutils.js');
const Renderer = require('tkwidgets/framework/Renderer.js');

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
		this.term_ = tk.terminal;
		this.renderer_ = null;
		this.logger_ = new Logger();
		this.rootWidget_ = this.buildUi();
		this.renderer_ = new Renderer(this.term(), this.rootWidget_);

		this.app_.on('modelAction', async (event) => {
			await this.handleModelAction(event.action);
		});
	}

	buildUi() {
		const rootWidget = new RootWidget();
		rootWidget.setName('rootWidget');

		const folderList = new ListWidget();
		folderList.setItems([]);
		folderList.setItemRenderer((item) => {
			return item.title;
		});
		folderList.setStyle({
			borderBottomWidth: 1,
		});
		folderList.setName('folderList');
		folderList.setVStretch(true);
		folderList.on('currentItemChange', async () => {
			const folder = folderList.currentItem();
			await this.updateNoteList(folder ? folder.id : null);
		});

		const noteList = new ListWidget();
		noteList.setItems([]);
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
			let note = noteList.currentItem();
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
		hLayout.addChild(folderList, { type: 'stretch', factor: 1 });
		hLayout.addChild(noteList, { type: 'stretch', factor: 1 });
		hLayout.addChild(noteText, { type: 'stretch', factor: 1 });

		const vLayout = new VLayoutWidget();
		vLayout.addChild(hLayout, { type: 'stretch', factor: 1 });
		vLayout.addChild(consoleWidget, { type: 'fixed', factor: 5 });

		const win1 = new WindowWidget();
		win1.addChild(vLayout);
		win1.setName('mainWindow');

		rootWidget.addChild(win1);

		return rootWidget;
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

	async handleModelAction(action) {
		this.logger().info(action);

		// "{"action":{"type":"NOTES_UPDATE_ONE","note":{"id":"56d0e2ea61004324b33a307983c9722c","todo_completed":1507306904833,"updated_time":1507306904834,"user_updated_time":1507306904834,"type_":1}}}"
		switch (action.type) {

			case 'NOTES_UPDATE_ONE':

				const folder = this.widget('folderList').currentItem();
				if (!folder) return;

				const note = action.note;
				this.logger().info(folder, note);
				if (note.parent_id != folder.id) return;


				const notes = await Note.previews(folder.id);

				this.widget('noteList').setItems(notes);
				break;

		}
	}

	async processCommand(cmd) {
		let note = this.widget('noteList').currentItem();
		let folder = this.widget('folderList').currentItem();
		let args = cliUtils.splitCommandString(cmd);

		for (let i = 0; i < args.length; i++) {
			if (note && args[i] == '%n') args[i] = note.id;
			if (folder && args[i] == '%b') args[i] = folder.id;
		}

		await this.app().execCommand(args);

		//this.logger().info(args);
	}

	async updateFolderList() {
		const folders = await Folder.all();
		this.widget('folderList').setItems(folders);
	}

	async updateNoteList(folderId) {
		const fields = Note.previewFields();
		fields.splice(fields.indexOf('body'), 1);
		const notes = folderId ? await Note.previews(folderId, { fields: fields }) : [];
		this.widget('noteList').setItems(notes);
	}

	async updateNoteText(note) {
		const text = note ? note.body : '';
		this.widget('noteText').setText(text);
	}

	async start() {
		const term = this.term();

		term.fullscreen();
		termutils.hideCursor(term);

		try {
			this.renderer_.start();

			await this.updateFolderList();

			term.grabInput();

			term.on('key', (name, matches, data) => {
				if (name === 'CTRL_C' ) {
					termutils.showCursor(term);
					term.fullscreen(false);
					process.exit();
				}

				if (name == 'c') {
					this.widget('console').focus();
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