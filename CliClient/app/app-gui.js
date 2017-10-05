import { Logger } from 'lib/logger.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';

const tk = require('terminal-kit');
//const term = tk.terminal;
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

		this.rootWidget_ = new RootWidget();
		this.rootWidget_.setName('rootWidget');

		const folderList = new ListWidget();
		folderList.setItems([]);
		folderList.setItemRenderer((item) => {
			return item.title;
		});
		folderList.setStyle({
			//borderTopWidth: 1,
			borderBottomWidth: 1,
			//borderLeftWidth: 1,
			//borderRightWidth: 1,
		});
		folderList.setName('folderList');
		folderList.setVStretch(true);
		folderList.on('currentItemChange', async () => {
			const folder = folderList.currentItem();
			await this.updateNoteList(folder ? folder.id : null);
		});

		const noteList = new ListWidget();
		noteList.setItems([]);
		noteList.setItemRenderer((item) => {
			return item.title;
		});
		noteList.setName('noteList');
		noteList.setVStretch(true);
		noteList.setStyle({
			//borderTopWidth: 1,
			borderBottomWidth: 1,
			borderLeftWidth: 1,
			borderRightWidth: 1,
		});
		noteList.on('currentItemChange', async () => {
			const note = noteList.currentItem();
			await this.updateNoteText(note);
		});

		const noteText = new TextWidget();
		noteText.setVStretch(true);
		noteText.setName('noteText');
		noteText.setStyle({
			//borderTopWidth: 1,
			borderBottomWidth: 1,
			//borderLeftWidth: 1,
			//borderRightWidth: 1,
		});

		const layout1 = new HLayoutWidget();
		//layout1.addChild(noteText, { type: 'fixed', factor: 20 });
		layout1.addChild(folderList, { type: 'stretch', factor: 1 });
		layout1.addChild(noteList, { type: 'stretch', factor: 1 });
		layout1.addChild(noteText, { type: 'stretch', factor: 1 });

		// const layout2 = new VLayoutWidget();
		// layout2.addChild(layout1, { type: 'stretch', factor: 1 });
		// layout2.addChild(listWidget3, { type: 'fixed', factor: 5 });

		const win1 = new WindowWidget();
		win1.addChild(layout1);
		win1.setName('mainWindow');
		win1.setLocation(1,1);

		this.rootWidget_.addChild(win1);

		this.renderer_ = new Renderer(this.term(), this.rootWidget_);
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

	async updateFolderList() {
		const folders = await Folder.all();
		this.widget('folderList').setItems(folders);
	}

	async updateNoteList(folderId) {
		const notes = folderId ? await Note.previews(folderId) : [];
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

			term.on('key', function( name , matches , data ) {
				if (name === 'CTRL_C' ) {
					termutils.showCursor(term);
					term.fullscreen(false);
					process.exit();
				}

				if (name === 'CTRL_J') {
					consoleWidget.focus();
				}

				if (name == 't') {
					if (win1.isActiveWindow()) {
						win2.activate();
					} else {
						win1.activate();
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