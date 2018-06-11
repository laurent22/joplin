const React = require('react');
const Note = require('lib/models/Note.js');
const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');
const Search = require('lib/models/Search.js');
const { time } = require('lib/time-utils.js');
const Setting = require('lib/models/Setting.js');
const { IconButton } = require('./IconButton.min.js');
const Toolbar = require('./Toolbar.min.js');
const { connect } = require('react-redux');
const { _ } = require('lib/locale.js');
const { reg } = require('lib/registry.js');
const MdToHtml = require('lib/MdToHtml');
const shared = require('lib/components/shared/note-screen-shared.js');
const { bridge } = require('electron').remote.require('./bridge');
const { themeStyle } = require('../theme.js');
const AceEditor = require('react-ace').default;
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const { shim } = require('lib/shim.js');
const eventManager = require('../eventManager');
const fs = require('fs-extra');
const {clipboard} = require('electron')
const md5 = require('md5');
const mimeUtils = require('lib/mime-utils.js').mime;
const ArrayUtils = require('lib/ArrayUtils');
const urlUtils = require('lib/urlUtils');

require('brace/mode/markdown');
// https://ace.c9.io/build/kitchen-sink.html
// https://highlightjs.org/static/demo/
require('brace/theme/chrome');

class NoteTextComponent extends React.Component {

	constructor() {
		super();

		this.state = {
			note: null,
			noteMetadata: '',
			showNoteMetadata: false,
			folder: null,
			lastSavedNote: null,
			isLoading: true,
			webviewReady: false,
			scrollHeight: null,
			editorScrollTop: 0,
			newNote: null,

			// If the current note was just created, and the title has never been
			// changed by the user, this variable contains that note ID. Used
			// to automatically set the title.
			newAndNoTitleChangeNoteId: null,
			bodyHtml: '',
		};

		this.lastLoadedNoteId_ = null;

		this.webviewListeners_ = null;
		this.ignoreNextEditorScroll_ = false;
		this.scheduleSaveTimeout_ = null;
		this.restoreScrollTop_ = null;
		this.lastSetHtml_ = '';
		this.lastSetMarkers_ = [];

		// Complicated but reliable method to get editor content height
		// https://github.com/ajaxorg/ace/issues/2046
		this.editorMaxScrollTop_ = 0;
		this.onAfterEditorRender_ = () => {
			const r = this.editor_.editor.renderer;
			this.editorMaxScrollTop_ = Math.max(0, r.layerConfig.maxHeight - r.$size.scrollerHeight);

			if (this.restoreScrollTop_ !== null) {
				this.editorSetScrollTop(this.restoreScrollTop_);
				this.restoreScrollTop_ = null;
			}
		}

		this.onAlarmChange_ = (event) => { if (event.noteId === this.props.noteId) this.reloadNote(this.props); }
		this.onNoteTypeToggle_ = (event) => { if (event.noteId === this.props.noteId) this.reloadNote(this.props); }
		this.onTodoToggle_ = (event) => { if (event.noteId === this.props.noteId) this.reloadNote(this.props); }

		this.onEditorPaste_ = async (event) => {
			const formats = clipboard.availableFormats();
			for (let i = 0; i < formats.length; i++) {
				const format = formats[i].toLowerCase();
				const formatType = format.split('/')[0]
				if (formatType === 'image') {
					event.preventDefault();

					const image = clipboard.readImage();

					const fileExt = mimeUtils.toFileExtension(format);
					const filePath = Setting.value('tempDir') + '/' + md5(Date.now()) + '.' + fileExt;

					await shim.writeImageToFile(image, format, filePath);
					await this.commandAttachFile([filePath]);
					await shim.fsDriver().remove(filePath);
				}
			}
		}

		this.onDrop_ = async (event) => {
			const files = event.dataTransfer.files;
			if (!files || !files.length) return;

			const filesToAttach = [];

			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				if (!file.path) continue;
				filesToAttach.push(file.path);
			}

			await this.commandAttachFile(filesToAttach);
		}

		this.aceEditor_selectionChange = (selection) => {
			const ranges = selection.getAllRanges();

			if (!ranges || !ranges.length || !this.state.note) {
				this.setState({
					selection: null,
					selectionRange: null,
				});
				return;
			}

			const range = ranges[0];
			let newSelection = {
				start: this.cursorPositionToTextOffsets(range.start, this.state.note.body),
				end: this.cursorPositionToTextOffsets(range.end, this.state.note.body),
			};

			if (newSelection.start === newSelection.end) newSelection = null;

			this.setState({
				selection: newSelection,
				selectionRange: range,
			});
		}
	}

	cursorPosition() {
		return this.cursorPositionToTextOffsets(this.editor_.editor.getCursorPosition(), this.state.note.body);
	}

	cursorPositionToTextOffsets(cursorPos, body) {
		if (!this.editor_ || !this.editor_.editor || !this.state.note || !this.state.note.body) return 0;

		const noteLines = body.split('\n');

		let pos = 0;
		for (let i = 0; i < noteLines.length; i++) {
			if (i > 0) pos++; // Need to add the newline that's been removed in the split() call above

			if (i === cursorPos.row) {
				pos += cursorPos.column;
				break;
			} else {
				pos += noteLines[i].length;
			}
		}

		return pos;		
	}

	mdToHtml() {
		if (this.mdToHtml_) return this.mdToHtml_;
		this.mdToHtml_ = new MdToHtml({
			resourceBaseUrl: 'file://' + Setting.value('resourceDir') + '/',
		});
		return this.mdToHtml_;
	}

	async componentWillMount() {
		let note = null;

		if (this.props.newNote) {
			note = Object.assign({}, this.props.newNote);
		} else if (this.props.noteId) {
			note = await Note.load(this.props.noteId);
		}

		const folder = note ? Folder.byId(this.props.folders, note.parent_id) : null;

		this.setState({
			lastSavedNote: Object.assign({}, note),
			note: note,
			folder: folder,
			isLoading: false,
		});

		this.lastLoadedNoteId_ = note ? note.id : null;

		this.updateHtml(note && note.body ? note.body : '');

		eventManager.on('alarmChange', this.onAlarmChange_);
		eventManager.on('noteTypeToggle', this.onNoteTypeToggle_);
		eventManager.on('todoToggle', this.onTodoToggle_);
	}

	componentWillUnmount() {
		this.saveIfNeeded();

		this.mdToHtml_ = null;
		this.destroyWebview();

		eventManager.removeListener('alarmChange', this.onAlarmChange_);
		eventManager.removeListener('noteTypeToggle', this.onNoteTypeToggle_);
		eventManager.removeListener('todoToggle', this.onTodoToggle_);
	}

	async saveIfNeeded(saveIfNewNote = false) {
		const forceSave = saveIfNewNote && (this.state.note && !this.state.note.id);

		if (this.scheduleSaveTimeout_) clearTimeout(this.scheduleSaveTimeout_);
		this.scheduleSaveTimeout_ = null;
		if (!forceSave) {
			if (!shared.isModified(this)) return;
		}
		await shared.saveNoteButton_press(this);
	}

	async saveOneProperty(name, value) {
		if (this.state.note && !this.state.note.id) {
			const note = Object.assign({}, this.state.note);
			note[name] = value;
			this.setState({ note: note });
			this.scheduleSave();
		} else {
			await shared.saveOneProperty(this, name, value);
		}
	}

	scheduleSave() {
		if (this.scheduleSaveTimeout_) clearTimeout(this.scheduleSaveTimeout_);
		this.scheduleSaveTimeout_ = setTimeout(() => {
			this.saveIfNeeded();
		}, 500);
	}

	async reloadNote(props, options = null) {
		if (!options) options = {};
		if (!('noReloadIfLocalChanges' in options)) options.noReloadIfLocalChanges = false;

		await this.saveIfNeeded();

		const previousNote = this.state.note ? Object.assign({}, this.state.note) : null;

		const stateNoteId = this.state.note ? this.state.note.id : null;
		let noteId = null;
		let note = null;
		let loadingNewNote = true;
		let parentFolder = null;

		if (props.newNote) {
			note = Object.assign({}, props.newNote);
			this.lastLoadedNoteId_ = null;
		} else {
			noteId = props.noteId;
			loadingNewNote = stateNoteId !== noteId;
			this.lastLoadedNoteId_ = noteId;
			note = noteId ? await Note.load(noteId) : null;
			if (noteId !== this.lastLoadedNoteId_) return; // Race condition - current note was changed while this one was loading
			if (options.noReloadIfLocalChanges && this.isModified()) return;

			// If the note hasn't been changed, exit now
			if (this.state.note && note) {
				let diff = Note.diffObjects(this.state.note, note);
				delete diff.type_;
				if (!Object.getOwnPropertyNames(diff).length) return;
			}
		}

		this.mdToHtml_ = null;

		// If we are loading nothing (noteId == null), make sure to
		// set webviewReady to false too because the webview component
		// is going to be removed in render().
		const webviewReady = this.webview_ && this.state.webviewReady && (noteId || props.newNote);

		// Scroll back to top when loading new note
		if (loadingNewNote) {
			this.editorMaxScrollTop_ = 0;

			// HACK: To go around a bug in Ace editor, we first set the scroll position to 1
			// and then (in the renderer callback) to the value we actually need. The first
			// operation helps clear the scroll position cache. See:
			// https://github.com/ajaxorg/ace/issues/2195
			this.editorSetScrollTop(1);
			this.restoreScrollTop_ = 0;

			// If a search is in progress we don't focus any field otherwise it will
			// take the focus out of the search box.
			if (note && this.props.notesParentType !== 'Search') {
				const focusSettingName = !!note.is_todo ? 'newTodoFocus' : 'newNoteFocus';

				if (Setting.value(focusSettingName) === 'title') {
					if (this.titleField_) this.titleField_.focus();
				} else {
					if (this.editor_) this.editor_.editor.focus();
				}
			}

			if (this.editor_) {
				// Calling setValue here does two things:
				// 1. It sets the initial value as recorded by the undo manager. If we were to set it instead to "" and wait for the render
				//    phase to set the value, the initial value would still be "", which means pressing "undo" on a note that has just loaded
				//    would clear it.
				// 2. It resets the undo manager - fixes https://github.com/laurent22/joplin/issues/355
				// Note: calling undoManager.reset() doesn't work
				try {
					this.editor_.editor.getSession().setValue(note ? note.body : '');
				} catch (error) {
					if (error.message === "Cannot read property 'match' of undefined") {
						// The internals of Ace Editor throws an exception when creating a new note,
						// but that can be ignored.
					} else {
						console.error(error);
					}
				}
				this.editor_.editor.clearSelection();
				this.editor_.editor.moveCursorTo(0,0);
			}
		}

		if (note)
		{
			parentFolder = Folder.byId(props.folders, note.parent_id);
		}

		let newState = {
			note: note,
			lastSavedNote: Object.assign({}, note),
			webviewReady: webviewReady,
			folder: parentFolder,
		};

		if (!note) {
			newState.newAndNoTitleChangeNoteId = null;
		} else if (note.id !== this.state.newAndNoTitleChangeNoteId) {
			newState.newAndNoTitleChangeNoteId = null;
		}

		this.lastSetHtml_ = '';
		this.lastSetMarkers_ = [];

		this.setState(newState);

		this.updateHtml(newState.note ? newState.note.body : '');
	}

	async componentWillReceiveProps(nextProps) {
		if (nextProps.newNote) {
			await this.reloadNote(nextProps);
		} else if ('noteId' in nextProps && nextProps.noteId !== this.props.noteId) {
			await this.reloadNote(nextProps);
		}

		if ('syncStarted' in nextProps && !nextProps.syncStarted && !this.isModified()) {
			await this.reloadNote(nextProps, { noReloadIfLocalChanges: true });
		}

		if (nextProps.windowCommand) {
			this.doCommand(nextProps.windowCommand);
		}
	}

	isModified() {
		return shared.isModified(this);
	}

	refreshNoteMetadata(force = null) {
		return shared.refreshNoteMetadata(this, force);
	}

	title_changeText(event) {
		shared.noteComponent_change(this, 'title', event.target.value);
		this.setState({ newAndNoTitleChangeNoteId: null });
		this.scheduleSave();
	}

	toggleIsTodo_onPress() {
		shared.toggleIsTodo_onPress(this);
		this.scheduleSave();
	}

	showMetadata_onPress() {
		shared.showMetadata_onPress(this);
	}

	async webview_ipcMessage(event) {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;
		const arg1 = args && args.length >= 2 ? args[1] : null;

		reg.logger().debug('Got ipc-message: ' + msg, args);

		if (msg.indexOf('checkboxclick:') === 0) {
			// Ugly hack because setting the body here will make the scrollbar
			// go to some random position. So we save the scrollTop here and it
			// will be restored after the editor ref has been reset, and the
			// "afterRender" event has been called.
			this.restoreScrollTop_ = this.editorScrollTop();

			const newBody = this.mdToHtml_.handleCheckboxClick(msg, this.state.note.body);
			this.saveOneProperty('body', newBody);
		} else if (msg === 'percentScroll') {
			this.ignoreNextEditorScroll_ = true;
			this.setEditorPercentScroll(arg0);
		} else if (msg === 'contextMenu') {
			const itemType = arg0 && arg0.type;

			const menu = new Menu()

			if (itemType === "image" || itemType === "link") {
				const resource = await Resource.load(arg0.resourceId);
				const resourcePath = Resource.fullPath(resource);

				menu.append(new MenuItem({label: _('Open...'), click: async () => {
					const ok = bridge().openExternal('file://' + resourcePath);
					if (!ok) bridge().showErrorMessageBox(_('This file could not be opened: %s', resourcePath));
				}}));

				menu.append(new MenuItem({label: _('Save as...'), click: async () => {
					const filePath = bridge().showSaveDialog({
						defaultPath: resource.filename ? resource.filename : resource.title,
					});
					if (!filePath) return;
					await fs.copy(resourcePath, filePath);
				}}));

				menu.append(new MenuItem({label: _('Copy path to clipboard'), click: async () => {
					const { clipboard } = require('electron');
					const { toSystemSlashes } = require('lib/path-utils.js');
					clipboard.writeText(toSystemSlashes(resourcePath));
				}}));
			} else {
				reg.logger().error('Unhandled item type: ' + itemType);
				return;
			}

			menu.popup(bridge().window());
		} else if (msg.indexOf('joplin://') === 0) {
			const itemId = msg.substr('joplin://'.length);
			const item = await BaseItem.loadItemById(itemId);

			if (!item) throw new Error('No item with ID ' + itemId);

			if (item.type_ === BaseModel.TYPE_RESOURCE) {
				const filePath = Resource.fullPath(item);
				bridge().openItem(filePath);
			} else if (item.type_ === BaseModel.TYPE_NOTE) {
				this.props.dispatch({
					type: "FOLDER_SELECT",
					id: item.parent_id,
				});

				setTimeout(() => {
					this.props.dispatch({
						type: 'NOTE_SELECT',
						id: item.id,
					});
				}, 10);
			} else {
				throw new Error('Unsupported item type: ' + item.type_);
			}
		} else if (urlUtils.urlProtocol(msg)) {
			require('electron').shell.openExternal(msg);
		} else {
			bridge().showErrorMessageBox(_('Unsupported link or message: %s', msg));
		}
	}

	editorMaxScroll() {
		return this.editorMaxScrollTop_;
	}

	editorScrollTop() {
		return this.editor_.editor.getSession().getScrollTop();
	}

	editorSetScrollTop(v) {
		if (!this.editor_) return;
		this.editor_.editor.getSession().setScrollTop(v);
	}

	setEditorPercentScroll(p) {
		this.editorSetScrollTop(p * this.editorMaxScroll());
	}

	setViewerPercentScroll(p) {
		this.webview_.send('setPercentScroll', p);
	}

	editor_scroll() {
		if (this.ignoreNextEditorScroll_) {
			this.ignoreNextEditorScroll_ = false;
			return;
		}

		const m = this.editorMaxScroll();
		this.setViewerPercentScroll(m ? this.editorScrollTop() / m : 0);
	}

	webview_domReady() {
		if (!this.webview_) return;

		this.setState({
			webviewReady: true,
		});

		// if (Setting.value('env') === 'dev') this.webview_.openDevTools();
	}

	webview_ref(element) {
		if (this.webview_) {
			if (this.webview_ === element) return;
			this.destroyWebview();
		}

		if (!element) {
			this.destroyWebview();
		} else {
			this.initWebview(element);
		}
	}

	editor_ref(element) {
		if (this.editor_ === element) return;

		if (this.editor_) {
			this.editor_.editor.renderer.off('afterRender', this.onAfterEditorRender_);
			document.querySelector('#note-editor').removeEventListener('paste', this.onEditorPaste_, true);
		}

		this.editor_ = element;

		if (this.editor_) {
			this.editor_.editor.renderer.on('afterRender', this.onAfterEditorRender_);

			const cancelledKeys = [];
			const letters = ['F', 'T', 'P', 'Q', 'L', ','];
			for (let i = 0; i < letters.length; i++) {
				const l = letters[i];
				cancelledKeys.push('Ctrl+' + l); 
				cancelledKeys.push('Command+' + l); 
			}

			for (let i = 0; i < cancelledKeys.length; i++) {
				const k = cancelledKeys[i];
				this.editor_.editor.commands.bindKey(k, () => {
					// HACK: Ace doesn't seem to provide a way to override its shortcuts, but throwing
					// an exception from this undocumented function seems to cancel it without any
					// side effect.
					// https://stackoverflow.com/questions/36075846
					throw new Error('HACK: Overriding Ace Editor shortcut: ' + k);
				});
			}

			document.querySelector('#note-editor').addEventListener('paste', this.onEditorPaste_, true);
		}
	}

	initWebview(wv) {
		if (!this.webviewListeners_) {
			this.webviewListeners_ = {
				'dom-ready': this.webview_domReady.bind(this),
				'ipc-message': this.webview_ipcMessage.bind(this),
			};
		}

		for (let n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			wv.addEventListener(n, fn);
		}

		this.webview_ = wv;
	}

	destroyWebview() {
		if (!this.webview_) return;

		for (let n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			this.webview_.removeEventListener(n, fn);
		}

		this.webview_ = null;
	}

	aceEditor_change(body) {
		shared.noteComponent_change(this, 'body', body);
		this.scheduleHtmlUpdate();
		this.scheduleSave();
	}

	scheduleHtmlUpdate(timeout = 500) {
		if (this.scheduleHtmlUpdateIID_) {
			clearTimeout(this.scheduleHtmlUpdateIID_);
			this.scheduleHtmlUpdateIID_ = null;
		}

		if (timeout) {
			this.scheduleHtmlUpdateIID_ = setTimeout(() => {
				this.updateHtml();
			}, timeout);
		} else {
			this.updateHtml();
		}
	}

	updateHtml(body = null) {
		const mdOptions = {
			onResourceLoaded: () => {
				this.updateHtml();
				this.forceUpdate();
			},
			postMessageSyntax: 'ipcRenderer.sendToHost',
		};

		const theme = themeStyle(this.props.theme);

		let bodyToRender = body;
		if (bodyToRender === null) bodyToRender = this.state.note && this.state.note.body ? this.state.note.body : '';
		let bodyHtml = '';

		const visiblePanes = this.props.visiblePanes || ['editor', 'viewer'];

		if (!bodyToRender.trim() && visiblePanes.indexOf('viewer') >= 0 && visiblePanes.indexOf('editor') < 0) {
			// Fixes https://github.com/laurent22/joplin/issues/217
			bodyToRender = '*' + _('This note has no content. Click on "%s" to toggle the editor and edit the note.', _('Layout')) + '*';
		}

		bodyHtml = this.mdToHtml().render(bodyToRender, theme, mdOptions);

		this.setState({ bodyHtml: bodyHtml });
	}

	async doCommand(command) {
		if (!command) return;

		let commandProcessed = true;

		if (command.name === 'exportPdf' && this.webview_) {
			const path = bridge().showSaveDialog({
				filters: [{ name: _('PDF File'), extensions: ['pdf']}]
			});

			if (path) {
				this.webview_.printToPDF({}, (error, data) => {
					if (error) {
						bridge().showErrorMessageBox(error.message);
					} else {
						shim.fsDriver().writeFile(path, data, 'buffer');
					}
				});
			}
		} else if (command.name === 'print' && this.webview_) {
			this.webview_.print();
		} else if (command.name === 'textBold') {
			this.commandTextBold();
		} else if (command.name === 'textItalic') {
			this.commandTextItalic();
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

	async commandAttachFile(filePaths = null) {
		if (!filePaths) {
			filePaths = bridge().showOpenDialog({
				properties: ['openFile', 'createDirectory', 'multiSelections'],
			});
			if (!filePaths || !filePaths.length) return;
		}

		await this.saveIfNeeded(true);
		let note = await Note.load(this.state.note.id);

		const position = this.cursorPosition();

		for (let i = 0; i < filePaths.length; i++) {
			const filePath = filePaths[i];
			try {
				reg.logger().info('Attaching ' + filePath);
				note = await shim.attachFileToNote(note, filePath, position);
				reg.logger().info('File was attached.');
				this.setState({
					note: Object.assign({}, note),
					lastSavedNote: Object.assign({}, note),
				});

				this.updateHtml(note.body);
			} catch (error) {
				reg.logger().error(error);
				bridge().showErrorMessageBox(error.message);
			}
		}
	}

	async commandSetAlarm() {
		await this.saveIfNeeded(true);

		this.props.dispatch({
			type: 'WINDOW_COMMAND',
			name: 'editAlarm',
			noteId: this.state.note.id,
		});
	}

	async commandSetTags() {
		await this.saveIfNeeded(true);

		this.props.dispatch({
			type: 'WINDOW_COMMAND',
			name: 'setTags',
			noteId: this.state.note.id,
		});
	}

	// Returns the actual Ace Editor instance (not the React wrapper)
	rawEditor() {
		return this.editor_ && this.editor_.editor ? this.editor_.editor : null;
	}

	updateEditorWithDelay(fn) {
		setTimeout(() => {
			if (!this.rawEditor()) return;
			fn(this.rawEditor());
		}, 10);
	}

	wrapSelectionWithStrings(string1, string2) {
		if (!this.rawEditor() || !this.state.note) return;

		const selection = this.state.selection;

		let newBody = this.state.note.body;

		if (selection) {
			const s1 = this.state.note.body.substr(0, selection.start);
			const s2 = this.state.note.body.substr(selection.start, selection.end - selection.start);
			const s3 = this.state.note.body.substr(selection.end);
			newBody = s1 + string1 + s2 + string2 + s3;

			const r = this.state.selectionRange;

			const newRange = {
				start: { row: r.start.row, column: r.start.column + string1.length},
				end: { row: r.end.row, column: r.end.column + string1.length},
			};

			this.updateEditorWithDelay((editor) => {
				const range = this.state.selectionRange;
				range.setStart(newRange.start.row, newRange.start.column);
				range.setEnd(newRange.end.row, newRange.end.column);
				editor.getSession().getSelection().setSelectionRange(range, false);
				editor.focus();
			});
		} else {
			const cursorPos = this.cursorPosition();
			const s1 = this.state.note.body.substr(0, cursorPos);
			const s2 = this.state.note.body.substr(cursorPos);
			newBody = s1 + string1 + string2 + s2;

			this.updateEditorWithDelay((editor) => {
				for (let i = 0; i < string1.length; i++) {
					editor.getSession().getSelection().moveCursorRight();
				}
				editor.focus();
			}, 10);
		}

		shared.noteComponent_change(this, 'body', newBody);
		this.scheduleHtmlUpdate();
	}

	async commandTextBold() {
		this.wrapSelectionWithStrings('**', '**');
	}

	async commandTextItalic() {
		this.wrapSelectionWithStrings('*', '*');
	}

	itemContextMenu(event) {
		const note = this.state.note;
		if (!note) return;

		const menu = new Menu()

		menu.append(new MenuItem({label: _('Attach file'), click: async () => {
			return this.commandAttachFile();
		}}));

		menu.append(new MenuItem({label: _('Tags'), click: async () => {
			return this.commandSetTags();
		}}));

		if (!!note.is_todo) {
			menu.append(new MenuItem({label: _('Set alarm'), click: async () => {
				return this.commandSetAlarm();
			}}));
		}

		menu.popup(bridge().window());
	}

	createToolbarItems(note) {
		const toolbarItems = [];
		if (note && this.state.folder && ['Search', 'Tag'].includes(this.props.notesParentType)) {
			toolbarItems.push({
				title: _('In: %s', this.state.folder.title),
				iconName: 'fa-folder-o',
				enabled: false,
			});
		}

		toolbarItems.push({
			tooltip: _('Bold'),
			iconName: 'fa-bold',
			onClick: () => { return this.commandTextBold(); },
		});

		toolbarItems.push({
			tooltip: _('Italic'),
			iconName: 'fa-italic',
			onClick: () => { return this.commandTextItalic(); },
		});

		toolbarItems.push({
			tooltip: _('Attach file'),
			iconName: 'fa-paperclip',
			onClick: () => { return this.commandAttachFile(); },
		});

		toolbarItems.push({
			tooltip: _('Tags'),
			iconName: 'fa-tags',
			onClick: () => { return this.commandSetTags(); },
		});

		if (note.is_todo) {
			const item = {
				iconName: 'fa-clock-o',
				enabled: !note.todo_completed,
				onClick: () => { return this.commandSetAlarm(); },
			}
			if (Note.needAlarm(note)) {
				item.title = time.formatMsToLocal(note.todo_due);
			} else {
				item.tooltip = _('Set alarm');
			}
			toolbarItems.push(item);
		}

		return toolbarItems;
	}

	render() {
		const style = this.props.style;
		const note = this.state.note;
		const body = note && note.body ? note.body : '';
		const theme = themeStyle(this.props.theme);
		const visiblePanes = this.props.visiblePanes || ['editor', 'viewer'];
		const isTodo = note && !!note.is_todo;

		const borderWidth = 1;

		const rootStyle = Object.assign({
			borderLeft: borderWidth + 'px solid ' + theme.dividerColor,
			boxSizing: 'border-box',
			paddingLeft: 10,
			paddingRight: 0,
		}, style);

		const innerWidth = rootStyle.width - rootStyle.paddingLeft - rootStyle.paddingRight - borderWidth;

		if (!note || !!note.encryption_applied) {
			const emptyDivStyle = Object.assign({
				backgroundColor: 'black',
				opacity: 0.1,
			}, rootStyle);
			return <div style={emptyDivStyle}></div>
		}

		const titleBarStyle = {
			width: innerWidth - rootStyle.paddingLeft,
			height: 30,
			boxSizing: 'border-box',
			marginTop: 10,
			marginBottom: 0,
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
		};

		const titleEditorStyle = {
			display: 'flex',
			flex: 1,
			display: 'inline-block',
			paddingTop: 5,
			paddingBottom: 5,
			paddingLeft: 8,
			paddingRight: 8,
			marginRight: rootStyle.paddingLeft,
		};

		const toolbarStyle = {
			marginBottom: 10,
		};

		const bottomRowHeight = rootStyle.height - titleBarStyle.height - titleBarStyle.marginBottom - titleBarStyle.marginTop - theme.toolbarHeight - toolbarStyle.marginBottom;

		const viewerStyle = {
			width: Math.floor(innerWidth / 2),
			height: bottomRowHeight,
			overflow: 'hidden',
			float: 'left',
			verticalAlign: 'top',
			boxSizing: 'border-box',
		};

		const paddingTop = 14;

		const editorStyle = {
			width: innerWidth - viewerStyle.width,
			height: bottomRowHeight - paddingTop,
			overflowY: 'hidden',
			float: 'left',
			verticalAlign: 'top',
			paddingTop: paddingTop + 'px',
			lineHeight: theme.textAreaLineHeight + 'px',
			fontSize: theme.fontSize + 'px',
		};

		if (visiblePanes.indexOf('viewer') < 0) {
			// Note: setting webview.display to "none" is currently not supported due
			// to this bug: https://github.com/electron/electron/issues/8277
			// So instead setting the width 0.
			viewerStyle.width = 0;
			editorStyle.width = innerWidth;
		}

		if (visiblePanes.indexOf('editor') < 0) {
			editorStyle.display = 'none';
			viewerStyle.width = innerWidth;
		}

		if (visiblePanes.indexOf('viewer') >= 0 && visiblePanes.indexOf('editor') >= 0) {
			viewerStyle.borderLeft = '1px solid ' + theme.dividerColor;
		} else {
			viewerStyle.borderLeft = 'none';
		}

		if (this.state.webviewReady) {
			let html = this.state.bodyHtml;

			const htmlHasChanged = this.lastSetHtml_ !== html;
			 if (htmlHasChanged) {
				this.webview_.send('setHtml', html);
				this.lastSetHtml_ = html;
			}

			const search = BaseModel.byId(this.props.searches, this.props.selectedSearchId);
			const keywords = search ? Search.keywords(search.query_pattern) : [];

			if (htmlHasChanged || !ArrayUtils.contentEquals(this.lastSetMarkers_, keywords)) {
				this.lastSetMarkers_ = [];
				this.webview_.send('setMarkers', keywords);
			}
		}

		const toolbarItems = this.createToolbarItems(note);

		const toolbar = <Toolbar
			style={toolbarStyle}
			items={toolbarItems}
		/>

		const titleEditor = <input
			type="text"
			ref={(elem) => { this.titleField_ = elem; } }
			style={titleEditorStyle}
			value={note && note.title ? note.title : ''}
			onChange={(event) => { this.title_changeText(event); }}
			placeholder={ this.props.newNote ? _('Creating new %s...', isTodo ? _('to-do') : _('note')) : '' }
		/>

		const titleBarMenuButton = <IconButton style={{
			display: 'flex',
		}} iconName="fa-caret-down" theme={this.props.theme} onClick={() => { this.itemContextMenu() }} />

		const titleBarDate = <span style={Object.assign({}, theme.textStyle, {color: theme.colorFaded})}>{time.formatMsToLocal(note.user_updated_time)}</span>

		const viewer =  <webview
			style={viewerStyle}
			nodeintegration="1"
			src="gui/note-viewer/index.html"
			ref={(elem) => { this.webview_ref(elem); } }
		/>

		// const markers = [{
		// 	startRow: 2,
		// 	startCol: 3,
		// 	endRow: 2,
		// 	endCol: 6,
		// 	type: 'text',
		// 	className: 'test-marker'
		// }];

		// markers={markers}
		// editorProps={{$useWorker: false}}

		// #note-editor .test-marker {
		// 	background-color: red;
		// 	color: yellow;
		// 	position: absolute;
		// }

		const editorRootStyle = Object.assign({}, editorStyle);
		delete editorRootStyle.width;
		delete editorRootStyle.height;
		delete editorRootStyle.fontSize;
		const editor =  <AceEditor
			value={body}
			mode="markdown"
			theme="chrome"
			style={editorRootStyle}
			width={editorStyle.width + 'px'}
			height={editorStyle.height + 'px'}
			fontSize={editorStyle.fontSize}
			showGutter={false}
			name="note-editor"
			wrapEnabled={true}
			onScroll={(event) => { this.editor_scroll(); }}
			ref={(elem) => { this.editor_ref(elem); } }
			onChange={(body) => { this.aceEditor_change(body) }}
			showPrintMargin={false}
			onSelectionChange={this.aceEditor_selectionChange}

			// Disable warning: "Automatically scrolling cursor into view after
			// selection change this will be disabled in the next version set
			// editor.$blockScrolling = Infinity to disable this message"
			editorProps={{$blockScrolling: true}}

			// This is buggy (gets outside the container)
			highlightActiveLine={false}			
		/>

		return (
			<div style={rootStyle} onDrop={this.onDrop_}>
				<div style={titleBarStyle}>
					{ titleEditor }
					{ titleBarDate }
					{ false ? titleBarMenuButton : null }
				</div>
				{ toolbar }
				{ editor }
				{ viewer }
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		noteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null,
		folderId: state.selectedFolderId,
		itemType: state.selectedItemType,
		folders: state.folders,
		theme: state.settings.theme,
		showAdvancedOptions: state.settings.showAdvancedOptions,
		syncStarted: state.syncStarted,
		newNote: state.newNote,
		windowCommand: state.windowCommand,
		notesParentType: state.notesParentType,
		searches: state.searches,
		selectedSearchId: state.selectedSearchId,
	};
};

const NoteText = connect(mapStateToProps)(NoteTextComponent);

module.exports = { NoteText };