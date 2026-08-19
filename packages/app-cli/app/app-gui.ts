import Logger, { LoggerWrapper } from '@joplin/utils/Logger';
import Folder from '@joplin/lib/models/Folder';
import BaseItem from '@joplin/lib/models/BaseItem';
import Tag from '@joplin/lib/models/Tag';
import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import Resource from '@joplin/lib/models/Resource';
import Setting from '@joplin/lib/models/Setting';
import reducer, { defaultState, State } from '@joplin/lib/reducer';
import { Store } from 'redux';
import { splitCommandString } from '@joplin/utils';
import { reg } from '@joplin/lib/registry';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import { AllHtmlEntities } from 'html-entities';
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import { NoteEntity } from '@joplin/lib/services/database/types';
import NoteWidget from './gui/NoteWidget';
import LinkSelector from './LinkSelector';
import ResourceServer from './ResourceServer';
import NoteMetadataWidget from './gui/NoteMetadataWidget';
import FolderListWidget from './gui/FolderListWidget';
import NoteListWidget from './gui/NoteListWidget';
import StatusBarWidget, { PromptOptions } from './gui/StatusBarWidget';
import ConsoleWidget from './gui/ConsoleWidget';
import type { Application } from './app';

const htmlentities = new AllHtmlEntities().encode;

const chalk = require('chalk');
const tk = require('terminal-kit');
const TermWrapper = require('tkwidgets/framework/TermWrapper.js');
const Renderer = require('tkwidgets/framework/Renderer.js');

const BaseWidget = require('tkwidgets/BaseWidget.js');
const TextWidget = require('tkwidgets/TextWidget.js');
const HLayoutWidget = require('tkwidgets/HLayoutWidget.js');
const VLayoutWidget = require('tkwidgets/VLayoutWidget.js');
const ReduxRootWidget = require('tkwidgets/ReduxRootWidget.js');
const WindowWidget = require('tkwidgets/WindowWidget.js');

// The keymap entries that the CLI dispatcher recognises. The shape is loose
// because items can have command-type-specific extra fields (e.g. cursorPosition
// on prompt-type entries) that the dispatcher reads opportunistically.
interface KeymapItem {
	command: string;
	keys: string[];
	type?: 'exec' | 'prompt' | 'function' | 'tkwidgets';
	canRunAlongOtherCommands?: boolean;
	cursorPosition?: number;
}

class AppGui {
	private app_: Application;
	private store_: Store<State>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TermWrapper from tkwidgets has no type definitions
	private term_: any;
	private tkWidgetKeys_: Record<string, string>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Renderer from tkwidgets has no type definitions
	private renderer_: any;
	private logger_: LoggerWrapper;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ReduxRootWidget from tkwidgets has no type definitions
	private rootWidget_: any;
	private keymap_: KeymapItem[];
	private commandCancelCalled_: boolean;
	private currentShortcutKeys_: string[];
	private lastShortcutKeyTime_: number;
	private linkSelector_: LinkSelector;
	private resourceServer_: ResourceServer;

	public constructor(app: Application, store: Store<State>, keymap: KeymapItem[]) {
		try {
			this.app_ = app;
			this.store_ = store;

			BaseWidget.setLogger(app.logger());

			this.term_ = new TermWrapper(tk.terminal);

			// Some keys are directly handled by the tkwidget framework
			// so they need to be remapped in a different way.
			this.tkWidgetKeys_ = {
				focus_next: 'TAB',
				focus_previous: 'SHIFT_TAB',
				move_up: 'UP',
				move_down: 'DOWN',
				page_down: 'PAGE_DOWN',
				page_up: 'PAGE_UP',
			};

			this.renderer_ = null;
			this.logger_ = new Logger();
			this.buildUi();

			this.renderer_ = new Renderer(this.term(), this.rootWidget_);

			this.app_.on('modelAction', async (...args: unknown[]) => {
				const event = args[0] as { action: unknown };
				await this.handleModelAction(event.action);
			});

			this.keymap_ = this.setupKeymap(keymap);

			this.commandCancelCalled_ = false;

			this.currentShortcutKeys_ = [];
			this.lastShortcutKeyTime_ = 0;

			this.linkSelector_ = new LinkSelector();

			// Recurrent sync is setup only when the GUI is started. In
			// a regular command it's not necessary since the process
			// exits right away.
			reg.setupRecurrentSync();
			void DecryptionWorker.instance().scheduleStart();
		} catch (error) {
			if (this.term_) { this.fullScreen(false); }
			console.error(error);
			process.exit(1);
		}
	}

	public store() {
		return this.store_;
	}

	public renderer() {
		return this.renderer_;
	}

	public async forceRender() {
		this.widget('root').invalidate();
		await this.renderer_.renderRoot();
	}

	public termSaveState() {
		return this.term().saveState();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- terminal-kit state object is untyped
	public termRestoreState(state: any) {
		return this.term().restoreState(state);
	}

	public prompt(initialText = '', promptString = ':', options: PromptOptions = null) {
		return this.widget('statusBar').prompt(initialText, promptString, options);
	}

	public stdoutMaxWidth() {
		return this.widget('console').innerWidth - 1;
	}

	public isDummy() {
		return false;
	}

	public buildUi() {
		this.rootWidget_ = new ReduxRootWidget(this.store_);
		this.rootWidget_.name = 'root';
		this.rootWidget_.autoShortcutsEnabled = false;

		const folderList = new FolderListWidget();
		folderList.style = {
			borderBottomWidth: 1,
			borderRightWidth: 1,
		};
		folderList.name = 'folderList';
		folderList.vStretch = true;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tkwidgets event payload is untyped
		folderList.on('currentItemChange', async (event: any) => {
			const item = folderList.currentItem;

			if (item === '-') {
				const newIndex = event.currentIndex + (event.previousIndex < event.currentIndex ? +1 : -1);
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
		this.rootWidget_.connect(folderList, (state: State) => {
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
			const note = noteList.currentItem;
			this.store_.dispatch({
				type: 'NOTE_SELECT',
				id: note ? note.id : null,
			});
		});
		this.rootWidget_.connect(noteList, (state: State) => {
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
		this.rootWidget_.connect(noteText, (state: State) => {
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
		this.rootWidget_.connect(noteMetadata, (state: State) => {
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
		hLayout.addChild(folderList, { type: 'stretch', factor: Setting.value('layout.folderList.factor') });
		hLayout.addChild(noteList, { type: 'stretch', factor: Setting.value('layout.noteList.factor') });
		hLayout.addChild(noteLayout, { type: 'stretch', factor: Setting.value('layout.note.factor') });

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

	public showModalOverlay(text: string) {
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

	public hideModalOverlay() {
		if (this.widget('overlayWindow')) this.widget('overlayWindow').hide();
		this.widget('mainWindow').activate();
	}

	public addCommandToConsole(cmd: string) {
		if (!cmd) return;
		const isConfigPassword = cmd.indexOf('config ') >= 0 && cmd.indexOf('password') >= 0;
		if (isConfigPassword) return;
		this.stdout(chalk.cyan.bold(`> ${cmd}`));
	}

	public setupKeymap(keymap: KeymapItem[]): KeymapItem[] {
		const output: KeymapItem[] = [];

		for (let i = 0; i < keymap.length; i++) {
			const item: KeymapItem = { ...keymap[i] };

			if (!item.command) throw new Error(`Missing command for keymap item: ${JSON.stringify(item)}`);

			if (!('type' in item)) item.type = 'exec';

			if (item.command in this.tkWidgetKeys_) {
				item.type = 'tkwidgets';
			}

			item.canRunAlongOtherCommands = item.type === 'function' && ['toggle_metadata', 'toggle_console'].indexOf(item.command) >= 0;

			output.push(item);
		}

		return output;
	}

	public toggleConsole() {
		this.showConsole(!this.consoleIsShown());
	}

	public showConsole(doShow = true) {
		this.widget('console').show(doShow);
	}

	public hideConsole() {
		this.showConsole(false);
	}

	public consoleIsShown() {
		return this.widget('console').shown;
	}

	public maximizeConsole(doMaximize = true) {
		const consoleWidget = this.widget('console');

		if (consoleWidget.isMaximized__ === undefined) {
			consoleWidget.isMaximized__ = false;
		}

		if (consoleWidget.isMaximized__ === doMaximize) return;

		const constraints = {
			type: 'stretch',
			factor: !doMaximize ? 1 : 4,
		};

		consoleWidget.isMaximized__ = doMaximize;

		this.widget('vLayout').setWidgetConstraints(consoleWidget, constraints);
	}

	public minimizeConsole() {
		this.maximizeConsole(false);
	}

	public consoleIsMaximized() {
		return this.widget('console').isMaximized__ === true;
	}

	public showNoteMetadata(show = true) {
		this.widget('noteMetadata').show(show);
	}

	public hideNoteMetadata() {
		this.showNoteMetadata(false);
	}

	public toggleNoteMetadata() {
		this.showNoteMetadata(!this.widget('noteMetadata').shown);
	}

	public toggleFolderIds() {
		this.widget('folderList').toggleShowIds();
		this.widget('noteList').toggleShowIds();
	}

	public toggleFolderCollapse() {
		const folderList = this.widget('folderList');
		if (folderList && folderList.toggleFolderCollapse) {
			folderList.toggleFolderCollapse();
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- widget lookup returns whichever widget type matches the name; callers know the shape they expect
	public widget(name: string): any {
		if (name === 'root') return this.rootWidget_;
		return this.rootWidget_.childByName(name);
	}

	public app(): Application {
		return this.app_;
	}

	public setLogger(l: LoggerWrapper) {
		this.logger_ = l;
	}

	public logger() {
		return this.logger_;
	}

	public keymap() {
		return this.keymap_;
	}

	public keymapItemByKey(key: string): KeymapItem | null {
		for (let i = 0; i < this.keymap_.length; i++) {
			const item = this.keymap_[i];
			if (item.keys.indexOf(key) >= 0) return item;
		}
		return null;
	}

	public term() {
		return this.term_;
	}

	public activeListItem() {
		const widget = this.widget('mainWindow').focusedWidget;
		if (!widget) return null;

		if (widget.name === 'noteList' || widget.name === 'folderList') {
			return widget.currentItem;
		}

		return null;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Redux action shape varies across the app's action union
	public async handleModelAction(action: any) {
		this.logger().info('Action:', action);

		const state = { ...defaultState };
		state.notes = this.widget('noteList').items;

		const newState = reducer(state, action);

		if (newState !== state) {
			this.widget('noteList').items = newState.notes;
		}
	}

	public async processFunctionCommand(cmd: string) {
		if (cmd === 'activate') {
			const w = this.widget('mainWindow').focusedWidget;
			if (w.name === 'folderList') {
				// eslint-disable-next-line no-restricted-properties
				this.widget('noteList').focus();
			} else if (w.name === 'noteList' || w.name === 'noteText') {
				void this.processPromptCommand('edit $n');
			}
		} else if (cmd === 'delete') {
			if (this.widget('folderList').hasFocus) {
				const item = this.widget('folderList').selectedJoplinItem;

				if (!item) return;

				if (item.type_ === BaseModel.TYPE_FOLDER) {
					await this.processPromptCommand(`rmbook ${item.id}`);
				} else if (item.type_ === BaseModel.TYPE_TAG) {
					this.stdout(_('To delete a tag, untag the associated notes.'));
				} else if (item.type_ === BaseModel.TYPE_SEARCH) {
					this.store().dispatch({
						type: 'SEARCH_DELETE',
						id: item.id,
					});
				}
			} else if (this.widget('noteList').hasFocus) {
				await this.processPromptCommand('rmnote $n');
			} else {
				this.stdout(_('Please select the note or notebook to be deleted first.'));
			}
		} else if (cmd === 'next_link' || cmd === 'previous_link') {
			const noteText = this.widget('noteText');

			noteText.render();

			if (cmd === 'next_link') this.linkSelector_.changeLink(noteText, 1);
			else this.linkSelector_.changeLink(noteText, -1);

			this.linkSelector_.scrollWidget(noteText);

			const cursorOffsetX = this.widget('mainWindow').width - noteText.innerWidth - 8;
			const cursorOffsetY = 1 - noteText.scrollTop_;

			if (this.linkSelector_.link) {
				this.term_.moveTo(
					this.linkSelector_.noteX + cursorOffsetX,
					this.linkSelector_.noteY + cursorOffsetY,
				);
				shim.setTimeout(() => this.term_.term().inverse(this.linkSelector_.link), 50);
			}
		} else if (cmd === 'open_link') {
			if (this.widget('noteText').hasFocus) {
				this.linkSelector_.openLink(this.widget('noteText'));
			}
		} else if (cmd === 'toggle_console') {
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
		} else if (cmd === 'toggle_metadata') {
			this.toggleNoteMetadata();
		} else if (cmd === 'toggle_ids') {
			this.toggleFolderIds();
		} else if (cmd === 'toggle_folder_collapse') {
			this.toggleFolderCollapse();
		} else if (cmd === 'enter_command_line_mode') {
			const inputCmd = await this.widget('statusBar').prompt();
			if (!inputCmd) return;
			this.addCommandToConsole(inputCmd);
			await this.processPromptCommand(inputCmd);
		} else {
			throw new Error(`Unknown command: ${cmd}`);
		}
	}

	public async processPromptCommand(cmd: string) {
		if (!cmd) return;
		cmd = cmd.trim();
		if (!cmd.length) return;

		// this.logger().debug('Got command: ' + cmd);

		try {
			const note = this.widget('noteList').currentItem;
			const folder = this.widget('folderList').currentItem;
			const args = splitCommandString(cmd);

			for (let i = 0; i < args.length; i++) {
				if (args[i] === '$n') {
					args[i] = note ? note.id : '';
				} else if (args[i] === '$b') {
					args[i] = folder ? folder.id : '';
				} else if (args[i] === '$c') {
					const item = this.activeListItem();
					args[i] = item ? item.id : '';
				}
			}

			await this.app().execCommand(args);
		} catch (error) {
			this.stdout(error.message);
		}

		this.widget('console').scrollBottom();

		// Invalidate so that the screen is redrawn in case inputting a command has moved
		// the GUI up (in particular due to autocompletion), it's moved back to the right position.
		this.widget('root').invalidate();
	}

	public async updateFolderList() {
		const folders = await Folder.all();
		this.widget('folderList').items = folders;
	}

	public async updateNoteList(folderId: string | null) {
		const fields = Note.previewFields();
		fields.splice(fields.indexOf('body'), 1);
		const notes = folderId ? await Note.previews(folderId, { fields: fields }) : [];
		this.widget('noteList').items = notes;
	}

	public async updateNoteText(note: NoteEntity | null) {
		const text = note ? note.body : '';
		this.widget('noteText').text = text;
	}

	// Any key after which a shortcut is not possible.
	public isSpecialKey(name: string) {
		return [':', 'ENTER', 'DOWN', 'UP', 'LEFT', 'RIGHT', 'DELETE', 'BACKSPACE', 'ESCAPE', 'TAB', 'SHIFT_TAB', 'PAGE_UP', 'PAGE_DOWN'].indexOf(name) >= 0;
	}

	public fullScreen(enable = true) {
		if (enable) {
			this.term().fullscreen();
			this.term().hideCursor();
			this.widget('root').invalidate();
		} else {
			this.term().fullscreen(false);
			this.term().showCursor();
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- text comes from many places (chalk-coloured strings, error.messages, raw values); JSON.stringified for the object case
	public stdout(text: any) {
		if (text === null || text === undefined) return;

		const lines = text.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const v = typeof lines[i] === 'object' ? JSON.stringify(lines[i]) : lines[i];
			this.widget('console').addLine(v);
		}

		this.updateStatusBarMessage();
	}

	public exit() {
		this.fullScreen(false);
		this.resourceServer_.stop();
	}

	public updateStatusBarMessage() {
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

	public async setupResourceServer() {
		const linkStyle = chalk.blue.underline;
		const noteTextWidget = this.widget('noteText');
		const resourceIdRegex = /^:\/[a-f0-9]+$/i;
		type NoteLink = { type: 'url'; url: string } | { type: 'item'; id: string };
		const noteLinks: Record<string, NoteLink> = {};

		const hasProtocol = (s: string, protocols: string[]) => {
			if (!s) return false;
			s = s.trim().toLowerCase();
			for (let i = 0; i < protocols.length; i++) {
				if (s.indexOf(`${protocols[i]}://`) === 0) return true;
			}
			return false;
		};

		// By default, before the server is started, only the regular
		// URLs appear in blue.
		noteTextWidget.markdownRendererOptions = {
			linkUrlRenderer: (_index: number, url: string) => {
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
				response.writeHead(302, { Location: link.url });
				return true;
			}

			if (link.type === 'item') {
				const itemId = link.id;
				const item = await BaseItem.loadItemById(itemId);
				if (!item) throw new Error(`No item with ID ${itemId}`); // Should be nearly impossible

				if (item.type_ === BaseModel.TYPE_RESOURCE) {
					if (item.mime) response.setHeader('Content-Type', item.mime);
					response.write(await Resource.content(item));
				} else if (item.type_ === BaseModel.TYPE_NOTE) {
					const html = [
						`
						<!DOCTYPE html>
						<html class="client-nojs" lang="en" dir="ltr">
						<head><meta charset="UTF-8"/></head><body>
					`,
					];
					html.push(`<pre>${htmlentities(item.title)}\n\n${htmlentities(item.body)}</pre>`);
					html.push('</body></html>');
					response.write(html.join(''));
				} else {
					throw new Error(`Unsupported item type: ${item.type_}`);
				}

				return true;
			}

			return false;
		});

		await this.resourceServer_.start();
		if (!this.resourceServer_.started()) return;

		noteTextWidget.markdownRendererOptions = {
			linkUrlRenderer: (index: number, url: string) => {
				if (!url) return url;

				if (resourceIdRegex.test(url)) {
					noteLinks[index] = {
						type: 'item',
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

				return linkStyle(`${this.resourceServer_.baseUrl()}/${index}`);
			},
		};
	}

	public async start() {
		const term = this.term();

		this.fullScreen();

		try {
			void this.setupResourceServer();

			this.renderer_.start();

			const statusBar = this.widget('statusBar');

			term.grabInput();

			term.on('key', async (name: string) => {
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

				if (name === 'CTRL_C') {
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

				// -------------------------------------------------------------------------
				// Build up current shortcut
				// -------------------------------------------------------------------------

				const now = new Date().getTime();

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
				const keymapItem = this.keymapItemByKey(shortcutKey);

				// If this command is an alias to another command, resolve to the actual command

				let processShortcutKeys: boolean = !this.app().currentCommand() && !!keymapItem;
				if (keymapItem && keymapItem.canRunAlongOtherCommands) processShortcutKeys = true;
				if (statusBar.promptActive) processShortcutKeys = false;

				if (processShortcutKeys) {
					this.logger().debug('Shortcut:', shortcutKey, keymapItem);

					this.currentShortcutKeys_ = [];

					if (keymapItem.type === 'function') {
						void this.processFunctionCommand(keymapItem.command);
					} else if (keymapItem.type === 'prompt') {
						const promptOptions: PromptOptions = {};
						if ('cursorPosition' in keymapItem) promptOptions.cursorPosition = keymapItem.cursorPosition;
						const commandString = await statusBar.prompt(keymapItem.command ? keymapItem.command : '', null, promptOptions);
						this.addCommandToConsole(commandString);
						await this.processPromptCommand(commandString);
					} else if (keymapItem.type === 'exec') {
						this.stdout(keymapItem.command);
						await this.processPromptCommand(keymapItem.command);
					} else if (keymapItem.type === 'tkwidgets') {
						this.widget('root').handleKey(this.tkWidgetKeys_[keymapItem.command]);
					} else {
						throw new Error(`Unknown command type: ${JSON.stringify(keymapItem)}`);
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

export default AppGui;
