require('app-module-path').addPath(__dirname);

const { BaseApplication } = require('lib/BaseApplication');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const Setting = require('lib/models/Setting.js');
const { shim } = require('lib/shim.js');
const MasterKey = require('lib/models/MasterKey');
const Note = require('lib/models/Note');
const { MarkupToHtml } = require('lib/joplin-renderer');
const { _, setLocale } = require('lib/locale.js');
const { Logger } = require('lib/logger.js');
const fs = require('fs-extra');
const Tag = require('lib/models/Tag.js');
const { reg } = require('lib/registry.js');
const { defaultState } = require('lib/reducer.js');
const packageInfo = require('./packageInfo.js');
const AlarmService = require('lib/services/AlarmService.js');
const AlarmServiceDriverNode = require('lib/services/AlarmServiceDriverNode');
const DecryptionWorker = require('lib/services/DecryptionWorker');
const InteropService = require('lib/services/InteropService');
const InteropServiceHelper = require('./InteropServiceHelper.js');
const ResourceService = require('lib/services/ResourceService');
const ClipperServer = require('lib/ClipperServer');
const ExternalEditWatcher = require('lib/services/ExternalEditWatcher');
const { bridge } = require('electron').remote.require('./bridge');
const { shell, webFrame, clipboard } = require('electron');
const Menu = bridge().Menu;
const PluginManager = require('lib/services/PluginManager');
const RevisionService = require('lib/services/RevisionService');
const MigrationService = require('lib/services/MigrationService');
const TemplateUtils = require('lib/TemplateUtils');
const CssUtils = require('lib/CssUtils');

const pluginClasses = [
	require('./plugins/GotoAnything.min'),
];

const appDefaultState = Object.assign({}, defaultState, {
	route: {
		type: 'NAV_GO',
		routeName: 'Main',
		props: {},
	},
	navHistory: [],
	fileToImport: null,
	windowCommand: null,
	noteVisiblePanes: ['editor', 'viewer'],
	sidebarVisibility: true,
	noteListVisibility: true,
	windowContentSize: bridge().windowContentSize(),
	watchedNoteFiles: [],
	lastEditorScrollPercents: {},
	devToolsVisible: false,
});

class Application extends BaseApplication {

	constructor() {
		super();
		this.lastMenuScreen_ = null;
	}

	hasGui() {
		return true;
	}

	checkForUpdateLoggerPath() {
		return `${Setting.value('profileDir')}/log-autoupdater.txt`;
	}

	reducer(state = appDefaultState, action) {
		let newState = state;

		try {
			switch (action.type) {

			case 'NAV_BACK':
			case 'NAV_GO':

				{
					const goingBack = action.type === 'NAV_BACK';

					if (goingBack && !state.navHistory.length) break;

					const currentRoute = state.route;

					newState = Object.assign({}, state);
					const newNavHistory = state.navHistory.slice();

					if (goingBack) {
						let newAction = null;
						while (newNavHistory.length) {
							newAction = newNavHistory.pop();
							if (newAction.routeName !== state.route.routeName) break;
						}

						if (!newAction) break;

						action = newAction;
					}

					if (!goingBack) newNavHistory.push(currentRoute);
					newState.navHistory = newNavHistory;
					newState.route = action;
				}
				break;

			case 'WINDOW_CONTENT_SIZE_SET':

				newState = Object.assign({}, state);
				newState.windowContentSize = action.size;
				break;

			case 'WINDOW_COMMAND':

				{
					newState = Object.assign({}, state);
					const command = Object.assign({}, action);
					delete command.type;
					newState.windowCommand = command.name ? command : null;
				}
				break;

			case 'NOTE_VISIBLE_PANES_TOGGLE':

				{
					const getNextLayout = (currentLayout) => {
						currentLayout = panes.length === 2 ? 'both' : currentLayout[0];

						let paneOptions;
						if (state.settings.layoutButtonSequence === Setting.LAYOUT_EDITOR_VIEWER) {
							paneOptions = ['editor', 'viewer'];
						} else if (state.settings.layoutButtonSequence === Setting.LAYOUT_EDITOR_SPLIT) {
							paneOptions = ['editor', 'both'];
						} else if (state.settings.layoutButtonSequence === Setting.LAYOUT_VIEWER_SPLIT) {
							paneOptions = ['viewer', 'both'];
						} else if (state.settings.layoutButtonSequence === Setting.LAYOUT_SPLIT_WYSIWYG) {
							paneOptions = ['both', 'wysiwyg'];
						} else {
							paneOptions = ['editor', 'viewer', 'both'];
						}

						const currentLayoutIndex = paneOptions.indexOf(currentLayout);
						const nextLayoutIndex = currentLayoutIndex === paneOptions.length - 1 ? 0 : currentLayoutIndex + 1;

						const nextLayout = paneOptions[nextLayoutIndex];
						return nextLayout === 'both' ? ['editor', 'viewer'] : [nextLayout];
					};

					newState = Object.assign({}, state);

					const panes = state.noteVisiblePanes.slice();
					newState.noteVisiblePanes = getNextLayout(panes);
				}
				break;

			case 'NOTE_VISIBLE_PANES_SET':

				newState = Object.assign({}, state);
				newState.noteVisiblePanes = action.panes;
				break;

			case 'SIDEBAR_VISIBILITY_TOGGLE':

				newState = Object.assign({}, state);
				newState.sidebarVisibility = !state.sidebarVisibility;
				break;

			case 'SIDEBAR_VISIBILITY_SET':
				newState = Object.assign({}, state);
				newState.sidebarVisibility = action.visibility;
				break;

			case 'NOTELIST_VISIBILITY_TOGGLE':
				newState = Object.assign({}, state);
				newState.noteListVisibility = !state.noteListVisibility;
				break;

			case 'NOTELIST_VISIBILITY_SET':
				newState = Object.assign({}, state);
				newState.noteListVisibility = action.visibility;
				break;

			case 'NOTE_FILE_WATCHER_ADD':

				if (newState.watchedNoteFiles.indexOf(action.id) < 0) {
					newState = Object.assign({}, state);
					const watchedNoteFiles = newState.watchedNoteFiles.slice();
					watchedNoteFiles.push(action.id);
					newState.watchedNoteFiles = watchedNoteFiles;
				}
				break;

			case 'NOTE_FILE_WATCHER_REMOVE':

				{
					newState = Object.assign({}, state);
					const idx = newState.watchedNoteFiles.indexOf(action.id);
					if (idx >= 0) {
						const watchedNoteFiles = newState.watchedNoteFiles.slice();
						watchedNoteFiles.splice(idx, 1);
						newState.watchedNoteFiles = watchedNoteFiles;
					}
				}
				break;

			case 'NOTE_FILE_WATCHER_CLEAR':

				if (state.watchedNoteFiles.length) {
					newState = Object.assign({}, state);
					newState.watchedNoteFiles = [];
				}
				break;

			case 'EDITOR_SCROLL_PERCENT_SET':

				{
					newState = Object.assign({}, state);
					const newPercents = Object.assign({}, newState.lastEditorScrollPercents);
					newPercents[action.noteId] = action.percent;
					newState.lastEditorScrollPercents = newPercents;
				}
				break;

			case 'NOTE_DEVTOOLS_TOGGLE':
				newState = Object.assign({}, state);
				newState.devToolsVisible = !newState.devToolsVisible;
				break;

			case 'NOTE_DEVTOOLS_SET':
				newState = Object.assign({}, state);
				newState.devToolsVisible = action.value;
				break;

			}
		} catch (error) {
			error.message = `In reducer: ${error.message} Action: ${JSON.stringify(action)}`;
			throw error;
		}

		return super.reducer(newState, action);
	}

	toggleDevTools(visible) {
		if (visible) {
			bridge().openDevTools();
		} else {
			bridge().closeDevTools();
		}
	}

	async generalMiddleware(store, next, action) {
		if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'locale' || action.type == 'SETTING_UPDATE_ALL') {
			setLocale(Setting.value('locale'));
			// The bridge runs within the main process, with its own instance of locale.js
			// so it needs to be set too here.
			bridge().setLocale(Setting.value('locale'));
			await this.refreshMenu();
		}

		if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'showTrayIcon' || action.type == 'SETTING_UPDATE_ALL') {
			this.updateTray();
		}

		if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'style.editor.fontFamily' || action.type == 'SETTING_UPDATE_ALL') {
			this.updateEditorFont();
		}

		if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'windowContentZoomFactor' || action.type == 'SETTING_UPDATE_ALL') {
			webFrame.setZoomFactor(Setting.value('windowContentZoomFactor') / 100);
		}

		if (['EVENT_NOTE_ALARM_FIELD_CHANGE', 'NOTE_DELETE'].indexOf(action.type) >= 0) {
			await AlarmService.updateNoteNotification(action.id, action.type === 'NOTE_DELETE');
		}

		const result = await super.generalMiddleware(store, next, action);
		const newState = store.getState();

		if (action.type === 'NAV_GO' || action.type === 'NAV_BACK') {
			app().updateMenu(newState.route.routeName);
		}

		if (['NOTE_VISIBLE_PANES_TOGGLE', 'NOTE_VISIBLE_PANES_SET'].indexOf(action.type) >= 0) {
			Setting.setValue('noteVisiblePanes', newState.noteVisiblePanes);
		}

		if (['SIDEBAR_VISIBILITY_TOGGLE', 'SIDEBAR_VISIBILITY_SET'].indexOf(action.type) >= 0) {
			Setting.setValue('sidebarVisibility', newState.sidebarVisibility);
		}

		if (['NOTELIST_VISIBILITY_TOGGLE', 'NOTELIST_VISIBILITY_SET'].indexOf(action.type) >= 0) {
			Setting.setValue('noteListVisibility', newState.noteListVisibility);
		}

		if (action.type.indexOf('NOTE_SELECT') === 0 || action.type.indexOf('FOLDER_SELECT') === 0) {
			this.updateMenuItemStates(newState);
		}

		if (['NOTE_DEVTOOLS_TOGGLE', 'NOTE_DEVTOOLS_SET'].indexOf(action.type) >= 0) {
			this.toggleDevTools(newState.devToolsVisible);
			this.updateMenuItemStates(newState);
		}

		return result;
	}

	async refreshMenu() {
		const screen = this.lastMenuScreen_;
		this.lastMenuScreen_ = null;
		await this.updateMenu(screen);
	}

	focusElement_(target) {
		this.dispatch({
			type: 'WINDOW_COMMAND',
			name: 'focusElement',
			target: target,
		});
	}

	async updateMenu(screen) {
		if (this.lastMenuScreen_ === screen) return;

		const sortNoteFolderItems = (type) => {
			const sortItems = [];
			const sortOptions = Setting.enumOptions(`${type}.sortOrder.field`);
			for (const field in sortOptions) {
				if (!sortOptions.hasOwnProperty(field)) continue;
				sortItems.push({
					label: sortOptions[field],
					screens: ['Main'],
					type: 'checkbox',
					checked: Setting.value(`${type}.sortOrder.field`) === field,
					click: () => {
						Setting.setValue(`${type}.sortOrder.field`, field);
						this.refreshMenu();
					},
				});
			}

			sortItems.push({ type: 'separator' });

			sortItems.push({
				label: Setting.settingMetadata(`${type}.sortOrder.reverse`).label(),
				type: 'checkbox',
				checked: Setting.value(`${type}.sortOrder.reverse`),
				screens: ['Main'],
				click: () => {
					Setting.setValue(`${type}.sortOrder.reverse`, !Setting.value(`${type}.sortOrder.reverse`));
				},
			});

			return sortItems;
		};

		const sortNoteItems = sortNoteFolderItems('notes');
		const sortFolderItems = sortNoteFolderItems('folders');

		const focusItems = [];

		focusItems.push({
			label: _('Sidebar'),
			click: () => { this.focusElement_('sideBar'); },
			accelerator: 'CommandOrControl+Shift+S',
		});

		focusItems.push({
			label: _('Note list'),
			click: () => { this.focusElement_('noteList'); },
			accelerator: 'CommandOrControl+Shift+L',
		});

		focusItems.push({
			label: _('Note title'),
			click: () => { this.focusElement_('noteTitle'); },
			accelerator: 'CommandOrControl+Shift+N',
		});

		focusItems.push({
			label: _('Note body'),
			click: () => { this.focusElement_('noteBody'); },
			accelerator: 'CommandOrControl+Shift+B',
		});

		let toolsItems = [];
		const importItems = [];
		const exportItems = [];
		const toolsItemsFirst = [];
		const templateItems = [];
		const ioService = new InteropService();
		const ioModules = ioService.modules();
		for (let i = 0; i < ioModules.length; i++) {
			const module = ioModules[i];
			if (module.type === 'exporter') {
				if (module.canDoMultiExport !== false) {
					exportItems.push({
						label: module.fullLabel(),
						screens: ['Main'],
						click: async () => {
							await InteropServiceHelper.export(this.dispatch.bind(this), module);
						},
					});
				}
			} else {
				for (let j = 0; j < module.sources.length; j++) {
					const moduleSource = module.sources[j];
					importItems.push({
						label: module.fullLabel(moduleSource),
						screens: ['Main'],
						click: async () => {
							let path = null;

							const selectedFolderId = this.store().getState().selectedFolderId;

							if (moduleSource === 'file') {
								path = bridge().showOpenDialog({
									filters: [{ name: module.description, extensions: module.fileExtensions }],
								});
							} else {
								path = bridge().showOpenDialog({
									properties: ['openDirectory', 'createDirectory'],
								});
							}

							if (!path || (Array.isArray(path) && !path.length)) return;

							if (Array.isArray(path)) path = path[0];

							this.dispatch({
								type: 'WINDOW_COMMAND',
								name: 'showModalMessage',
								message: _('Importing from "%s" as "%s" format. Please wait...', path, module.format),
							});

							const importOptions = {
								path,
								format: module.format,
								modulePath: module.path,
								onError: console.warn,
								destinationFolderId:
								!module.isNoteArchive && moduleSource === 'file'
									? selectedFolderId
									: null,
							};

							const service = new InteropService();
							try {
								const result = await service.import(importOptions);
								console.info('Import result: ', result);
							} catch (error) {
								bridge().showErrorMessageBox(error.message);
							}

							this.dispatch({
								type: 'WINDOW_COMMAND',
								name: 'hideModalMessage',
							});
						},
					});
				}
			}
		}

		exportItems.push({
			label: `PDF - ${_('PDF File')}`,
			screens: ['Main'],
			click: async () => {
				const selectedNoteIds = this.store().getState().selectedNoteIds;
				this.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'exportPdf',
					noteIds: selectedNoteIds,
				});
			},
		});

		// We need a dummy entry, otherwise the ternary operator to show a
		// menu item only on a specific OS does not work.
		const noItem = {
			type: 'separator',
			visible: false,
		};

		const syncStatusItem = {
			label: _('Synchronisation Status'),
			click: () => {
				this.dispatch({
					type: 'NAV_GO',
					routeName: 'Status',
				});
			},
		};

		const newNoteItem = {
			label: _('New note'),
			accelerator: 'CommandOrControl+N',
			screens: ['Main'],
			click: () => {
				this.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'newNote',
				});
			},
		};

		const newTodoItem = {
			label: _('New to-do'),
			accelerator: 'CommandOrControl+T',
			screens: ['Main'],
			click: () => {
				this.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'newTodo',
				});
			},
		};

		const newNotebookItem = {
			label: _('New notebook'),
			screens: ['Main'],
			click: () => {
				this.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'newNotebook',
				});
			},
		};

		const newSubNotebookItem = {
			label: _('New sub-notebook'),
			screens: ['Main'],
			click: () => {
				this.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'newSubNotebook',
					activeFolderId: Setting.value('activeFolderId'),
				});
			},
		};

		const printItem = {
			label: _('Print'),
			accelerator: 'CommandOrControl+P',
			screens: ['Main'],
			click: () => {
				this.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'print',
				});
			},
		};

		toolsItemsFirst.push(syncStatusItem, {
			type: 'separator',
			screens: ['Main'],
		});

		const templateDirExists = await shim.fsDriver().exists(Setting.value('templateDir'));

		templateItems.push({
			label: _('Create note from template'),
			visible: templateDirExists,
			click: () => {
				this.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'selectTemplate',
					noteType: 'note',
				});
			},
		}, {
			label: _('Create to-do from template'),
			visible: templateDirExists,
			click: () => {
				this.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'selectTemplate',
					noteType: 'todo',
				});
			},
		}, {
			label: _('Insert template'),
			visible: templateDirExists,
			accelerator: 'CommandOrControl+Alt+I',
			click: () => {
				this.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'selectTemplate',
				});
			},
		}, {
			label: _('Open template directory'),
			click: () => {
				const templateDir = Setting.value('templateDir');
				if (!templateDirExists) shim.fsDriver().mkdir(templateDir);
				shell.openItem(templateDir);
			},
		}, {
			label: _('Refresh templates'),
			click: async () => {
				const templates = await TemplateUtils.loadTemplates(Setting.value('templateDir'));

				this.store().dispatch({
					type: 'TEMPLATE_UPDATE_ALL',
					templates: templates,
				});
			},
		});

		// we need this workaround, because on macOS the menu is different
		const toolsItemsWindowsLinux = toolsItemsFirst.concat([{
			label: _('Options'),
			visible: !shim.isMac(),
			accelerator: 'CommandOrControl+,',
			click: () => {
				this.dispatch({
					type: 'NAV_GO',
					routeName: 'Config',
				});
			},
		}]);

		// the following menu items will be available for all OS under Tools
		const toolsItemsAll = [{
			label: `${_('Note attachments')}..`,
			click: () => {
				this.dispatch({
					type: 'NAV_GO',
					routeName: 'Resources',
				});
			},
		}];

		if (!shim.isMac()) {
			toolsItems = toolsItems.concat(toolsItemsWindowsLinux);
		}
		toolsItems = toolsItems.concat(toolsItemsAll);

		function _checkForUpdates(ctx) {
			bridge().checkForUpdates(false, bridge().window(), ctx.checkForUpdateLoggerPath(), { includePreReleases: Setting.value('autoUpdate.includePreReleases') });
		}

		function _showAbout() {
			const p = packageInfo;
			let gitInfo = '';
			if ('git' in p) {
				gitInfo = _('Revision: %s (%s)', p.git.hash, p.git.branch);
			}
			const copyrightText = 'Copyright © 2016-YYYY Laurent Cozic';
			const message = [
				p.description,
				'',
				copyrightText.replace('YYYY', new Date().getFullYear()),
				_('%s %s (%s, %s)', p.name, p.version, Setting.value('env'), process.platform),
				'',
				_('Client ID: %s', Setting.value('clientId')),
				_('Sync Version: %s', Setting.value('syncVersion')),
				_('Profile Version: %s', reg.db().version()),
			];
			if (gitInfo) {
				message.push(`\n${gitInfo}`);
				console.info(gitInfo);
			}
			const text = message.join('\n');

			const copyToClipboard = bridge().showMessageBox(text, {
				icon: `${bridge().electronApp().buildDir()}/icons/128x128.png`,
				buttons: [_('Copy'), _('OK')],
				cancelId: 1,
				defaultId: 1,
			});
			if (copyToClipboard === 0) {
				clipboard.writeText(message.splice(3).join('\n'));
			}
		}

		const rootMenuFile = {
			// Using a dummy entry for macOS here, because first menu
			// becomes 'Joplin' and we need a nenu called 'File' later.
			label: shim.isMac() ? '&JoplinMainMenu' : _('&File'),
			// `&` before one of the char in the label name mean, that
			// <Alt + F> will open this menu. It's needed becase electron
			// opens the first menu on Alt press if no hotkey assigned.
			// Issue: https://github.com/laurent22/joplin/issues/934
			submenu: [{
				label: _('About Joplin'),
				visible: shim.isMac() ? true : false,
				click: () => _showAbout(),
			}, {
				type: 'separator',
				visible: shim.isMac() ? true : false,
			}, {
				label: _('Preferences...'),
				visible: shim.isMac() ? true : false,
				accelerator: 'CommandOrControl+,',
				click: () => {
					this.dispatch({
						type: 'NAV_GO',
						routeName: 'Config',
					});
				},
			}, {
				label: _('Check for updates...'),
				visible: shim.isMac() ? true : false,
				click: () => _checkForUpdates(this),
			}, {
				type: 'separator',
				visible: shim.isMac() ? true : false,
			},
			shim.isMac() ? noItem : newNoteItem,
			shim.isMac() ? noItem : newTodoItem,
			shim.isMac() ? noItem : newNotebookItem,
			shim.isMac() ? noItem : newSubNotebookItem, {
				type: 'separator',
				visible: shim.isMac() ? false : true,
			}, {
				label: _('Templates'),
				visible: shim.isMac() ? false : true,
				submenu: templateItems,
			}, {
				type: 'separator',
				visible: shim.isMac() ? false : true,
			}, {
				label: _('Import'),
				visible: shim.isMac() ? false : true,
				submenu: importItems,
			}, {
				label: _('Export'),
				visible: shim.isMac() ? false : true,
				submenu: exportItems,
			}, {
				type: 'separator',
			}, {
				label: _('Synchronise'),
				accelerator: 'CommandOrControl+S',
				screens: ['Main'],
				click: async () => {
					this.dispatch({
						type: 'WINDOW_COMMAND',
						name: 'synchronize',
					});
				},
			}, shim.isMac() ? syncStatusItem : noItem, {
				type: 'separator',
			}, shim.isMac() ? noItem : printItem, {
				type: 'separator',
				platforms: ['darwin'],
			}, {
				label: _('Hide %s', 'Joplin'),
				platforms: ['darwin'],
				accelerator: 'CommandOrControl+H',
				click: () => { bridge().electronApp().hide(); },
			}, {
				type: 'separator',
			}, {
				label: _('Quit'),
				accelerator: 'CommandOrControl+Q',
				click: () => { bridge().electronApp().quit(); },
			}],
		};

		const rootMenuFileMacOs = {
			label: _('&File'),
			visible: shim.isMac() ? true : false,
			submenu: [
				newNoteItem,
				newTodoItem,
				newNotebookItem,
				newSubNotebookItem, {
					label: _('Close Window'),
					platforms: ['darwin'],
					accelerator: 'Command+W',
					selector: 'performClose:',
				},  {
					type: 'separator',
				}, {
					label: _('Templates'),
					submenu: templateItems,
				}, {
					type: 'separator',
				}, {
					label: _('Import'),
					submenu: importItems,
				}, {
					label: _('Export'),
					submenu: exportItems,
				}, {
					type: 'separator',
				},
				printItem,
			],
		};

		const layoutButtonSequenceOptions = Object.entries(Setting.enumOptions('layoutButtonSequence')).map(([layoutKey, layout]) => ({
			label: layout,
			screens: ['Main'],
			type: 'checkbox',
			checked: Setting.value('layoutButtonSequence') == layoutKey,
			click: () => {
				Setting.setValue('layoutButtonSequence', layoutKey);
				this.refreshMenu();
			},
		}));

		const rootMenus = {
			edit: {
				id: 'edit',
				label: _('&Edit'),
				submenu: [{
					id: 'edit:copy',
					label: _('Copy'),
					role: 'copy',
					accelerator: 'CommandOrControl+C',
				}, {
					id: 'edit:cut',
					label: _('Cut'),
					role: 'cut',
					accelerator: 'CommandOrControl+X',
				}, {
					id: 'edit:paste',
					label: _('Paste'),
					role: 'paste',
					accelerator: 'CommandOrControl+V',
				}, {
					id: 'edit:selectAll',
					label: _('Select all'),
					role: 'selectall',
					accelerator: 'CommandOrControl+A',
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					id: 'edit:bold',
					label: _('Bold'),
					screens: ['Main'],
					accelerator: 'CommandOrControl+B',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'textBold',
						});
					},
				}, {
					id: 'edit:italic',
					label: _('Italic'),
					screens: ['Main'],
					accelerator: 'CommandOrControl+I',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'textItalic',
						});
					},
				}, {
					id: 'edit:link',
					label: _('Link'),
					screens: ['Main'],
					accelerator: 'CommandOrControl+K',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'textLink',
						});
					},
				}, {
					id: 'edit:code',
					label: _('Code'),
					screens: ['Main'],
					accelerator: 'CommandOrControl+`',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'textCode',
						});
					},
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					id: 'edit:insertDateTime',
					label: _('Insert Date Time'),
					screens: ['Main'],
					accelerator: 'CommandOrControl+Shift+T',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'insertDateTime',
						});
					},
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					id: 'edit:commandStartExternalEditing',
					label: _('Edit in external editor'),
					screens: ['Main'],
					accelerator: 'CommandOrControl+E',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'commandStartExternalEditing',
						});
					},
				}, {
					id: 'edit:setTags',
					label: _('Tags'),
					screens: ['Main'],
					accelerator: 'CommandOrControl+Alt+T',
					click: () => {
						const selectedNoteIds = this.store().getState().selectedNoteIds;
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'setTags',
							noteIds: selectedNoteIds,
						});
					},
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					id: 'edit:focusSearch',
					label: _('Search in all the notes'),
					screens: ['Main'],
					accelerator: shim.isMac() ? 'Shift+Command+F' : 'F6',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'focusSearch',
						});
					},
				}, {
					id: 'edit:showLocalSearch',
					label: _('Search in current note'),
					screens: ['Main'],
					accelerator: 'CommandOrControl+F',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'showLocalSearch',
						});
					},
				}],
			},
			view: {
				label: _('&View'),
				submenu: [{
					label: _('Toggle sidebar'),
					screens: ['Main'],
					accelerator: shim.isMac() ? 'Option+Command+S' : 'F10',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'toggleSidebar',
						});
					},
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					label: _('Layout button sequence'),
					screens: ['Main'],
					submenu: layoutButtonSequenceOptions,
				}, {
					label: _('Toggle note list'),
					screens: ['Main'],
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'toggleNoteList',
						});
					},
				}, {
					label: _('Toggle editor layout'),
					screens: ['Main'],
					accelerator: 'CommandOrControl+L',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'toggleVisiblePanes',
						});
					},
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					label: Setting.settingMetadata('notes.sortOrder.field').label(),
					screens: ['Main'],
					submenu: sortNoteItems,
				}, {
					label: Setting.settingMetadata('folders.sortOrder.field').label(),
					screens: ['Main'],
					submenu: sortFolderItems,
				}, {
					label: Setting.settingMetadata('showNoteCounts').label(),
					type: 'checkbox',
					checked: Setting.value('showNoteCounts'),
					screens: ['Main'],
					click: () => {
						Setting.setValue('showNoteCounts', !Setting.value('showNoteCounts'));
					},
				}, {
					label: Setting.settingMetadata('uncompletedTodosOnTop').label(),
					type: 'checkbox',
					checked: Setting.value('uncompletedTodosOnTop'),
					screens: ['Main'],
					click: () => {
						Setting.setValue('uncompletedTodosOnTop', !Setting.value('uncompletedTodosOnTop'));
					},
				}, {
					label: Setting.settingMetadata('showCompletedTodos').label(),
					type: 'checkbox',
					checked: Setting.value('showCompletedTodos'),
					screens: ['Main'],
					click: () => {
						Setting.setValue('showCompletedTodos', !Setting.value('showCompletedTodos'));
					},
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					label: _('Focus'),
					screens: ['Main'],
					submenu: focusItems,
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					label: _('Actual Size'),
					click: () => {
						Setting.setValue('windowContentZoomFactor', 100);
					},
					accelerator: 'CommandOrControl+0',
				}, {
					label: _('Zoom In'),
					click: () => {
						Setting.incValue('windowContentZoomFactor', 10);
					},
					accelerator: 'CommandOrControl+=',
				}, {
					label: _('Zoom Out'),
					click: () => {
						Setting.incValue('windowContentZoomFactor', -10);
					},
					accelerator: 'CommandOrControl+-',
				}],
			},
			tools: {
				label: _('&Tools'),
				submenu: toolsItems,
			},
			help: {
				label: _('&Help'),
				submenu: [{
					label: _('Website and documentation'),
					accelerator: 'F1',
					click() { bridge().openExternal('https://joplinapp.org'); },
				}, {
					label: _('Joplin Forum'),
					click() { bridge().openExternal('https://discourse.joplinapp.org'); },
				}, {
					label: _('Make a donation'),
					click() { bridge().openExternal('https://joplinapp.org/donate/'); },
				}, {
					label: _('Check for updates...'),
					visible: shim.isMac() ? false : true,
					click: () => _checkForUpdates(this),
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					id: 'help:toggleDevTools',
					type: 'checkbox',
					label: _('Toggle development tools'),
					visible: true,
					click: () => {
						this.dispatch({
							type: 'NOTE_DEVTOOLS_TOGGLE',
						});
					},
				}, {
					type: 'separator',
					visible: shim.isMac() ? false : true,
					screens: ['Main'],
				}, {
					label: _('About Joplin'),
					visible: shim.isMac() ? false : true,
					click: () => _showAbout(),
				}],
			},
		};

		if (shim.isMac()) {
			rootMenus.macOsApp = rootMenuFile;
			rootMenus.file = rootMenuFileMacOs;
		} else {
			rootMenus.file = rootMenuFile;
		}

		// It seems the "visible" property of separators is ignored by Electron, making
		// it display separators that we want hidden. So this function iterates through
		// them and remove them completely.
		const cleanUpSeparators = items => {
			const output = [];
			for (const item of items) {
				if ('visible' in item && item.type === 'separator' && !item.visible) continue;
				output.push(item);
			}
			return output;
		};

		for (const key in rootMenus) {
			if (!rootMenus.hasOwnProperty(key)) continue;
			if (!rootMenus[key].submenu) continue;
			rootMenus[key].submenu = cleanUpSeparators(rootMenus[key].submenu);
		}

		const pluginMenuItems = PluginManager.instance().menuItems();
		for (const item of pluginMenuItems) {
			const itemParent = rootMenus[item.parent] ? rootMenus[item.parent] : 'tools';
			itemParent.submenu.push(item);
		}

		const template = [
			rootMenus.file,
			rootMenus.edit,
			rootMenus.view,
			rootMenus.tools,
			rootMenus.help,
		];

		if (shim.isMac()) template.splice(0, 0, rootMenus.macOsApp);

		function isEmptyMenu(template) {
			for (let i = 0; i < template.length; i++) {
				const t = template[i];
				if (t.type !== 'separator') return false;
			}
			return true;
		}

		function removeUnwantedItems(template, screen) {
			const platform = shim.platformName();

			let output = [];
			for (let i = 0; i < template.length; i++) {
				const t = Object.assign({}, template[i]);
				if (t.screens && t.screens.indexOf(screen) < 0) continue;
				if (t.platforms && t.platforms.indexOf(platform) < 0) continue;
				if (t.submenu) t.submenu = removeUnwantedItems(t.submenu, screen);
				if (('submenu' in t) && isEmptyMenu(t.submenu)) continue;
				output.push(t);
			}

			// Remove empty separator for now empty sections
			const temp = [];
			let previous = null;
			for (let i = 0; i < output.length; i++) {
				const t = Object.assign({}, output[i]);
				if (t.type === 'separator') {
					if (!previous) continue;
					if (previous.type === 'separator') continue;
				}
				temp.push(t);
				previous = t;
			}
			output = temp;

			return output;
		}

		const screenTemplate = removeUnwantedItems(template, screen);

		const menu = Menu.buildFromTemplate(screenTemplate);
		Menu.setApplicationMenu(menu);

		this.lastMenuScreen_ = screen;
	}

	async updateMenuItemStates(state = null) {
		if (!this.lastMenuScreen_) return;
		if (!this.store() && !state) return;

		if (!state) state = this.store().getState();

		const selectedNoteIds = state.selectedNoteIds;
		const note = selectedNoteIds.length === 1 ? await Note.load(selectedNoteIds[0]) : null;

		for (const itemId of ['copy', 'paste', 'cut', 'selectAll', 'bold', 'italic', 'link', 'code', 'insertDateTime', 'commandStartExternalEditing', 'showLocalSearch']) {
			const menuItem = Menu.getApplicationMenu().getMenuItemById(`edit:${itemId}`);
			if (!menuItem) continue;
			menuItem.enabled = !!note && note.markup_language === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;
		}

		const menuItem = Menu.getApplicationMenu().getMenuItemById('help:toggleDevTools');
		menuItem.checked = state.devToolsVisible;
	}

	updateTray() {
		const app = bridge().electronApp();

		if (app.trayShown() === Setting.value('showTrayIcon')) return;

		if (!Setting.value('showTrayIcon')) {
			app.destroyTray();
		} else {
			const contextMenu = Menu.buildFromTemplate([
				{ label: _('Open %s', app.electronApp().name), click: () => { app.window().show(); } },
				{ type: 'separator' },
				{ label: _('Exit'), click: () => { app.quit(); } },
			]);
			app.createTray(contextMenu);
		}
	}

	updateEditorFont() {
		const fontFamilies = [];
		if (Setting.value('style.editor.fontFamily')) fontFamilies.push(`"${Setting.value('style.editor.fontFamily')}"`);
		fontFamilies.push('monospace');

		// The '*' and '!important' parts are necessary to make sure Russian text is displayed properly
		// https://github.com/laurent22/joplin/issues/155

		const css = `.ace_editor * { font-family: ${fontFamilies.join(', ')} !important; }`;
		const styleTag = document.createElement('style');
		styleTag.type = 'text/css';
		styleTag.appendChild(document.createTextNode(css));
		document.head.appendChild(styleTag);
	}

	async loadCustomCss(filePath) {
		let cssString = '';
		if (await fs.pathExists(filePath)) {
			try {
				cssString = await fs.readFile(filePath, 'utf-8');

			} catch (error) {
				let msg = error.message ? error.message : '';
				msg = `Could not load custom css from ${filePath}\n${msg}`;
				error.message = msg;
				throw error;
			}
		}

		return cssString;
	}

	// async createManyNotes() {
	// 	return;
	// 	const folderIds = [];

	// 	const randomFolderId = (folderIds) => {
	// 		if (!folderIds.length) return '';
	// 		const idx = Math.floor(Math.random() * folderIds.length);
	// 		if (idx > folderIds.length - 1) throw new Error('Invalid index ' + idx + ' / ' + folderIds.length);
	// 		return folderIds[idx];
	// 	}

	// 	let rootFolderCount = 0;
	// 	let folderCount = 100;

	// 	for (let i = 0; i < folderCount; i++) {
	// 		let parentId = '';

	// 		if (Math.random() >= 0.9 || rootFolderCount >= folderCount / 10) {
	// 			parentId = randomFolderId(folderIds);
	// 		} else {
	// 			rootFolderCount++;
	// 		}

	// 		const folder = await Folder.save({ title: 'folder' + i, parent_id: parentId });
	// 		folderIds.push(folder.id);
	// 	}

	// 	for (let i = 0; i < 10000; i++) {
	// 		const parentId = randomFolderId(folderIds);
	// 		Note.save({ title: 'note' + i, parent_id: parentId });
	// 	}
	// }

	async start(argv) {
		const electronIsDev = require('electron-is-dev');

		// If running inside a package, the command line, instead of being "node.exe <path> <flags>" is "joplin.exe <flags>" so
		// insert an extra argument so that they can be processed in a consistent way everywhere.
		if (!electronIsDev) argv.splice(1, 0, '.');

		argv = await super.start(argv);

		// Loads app-wide styles. (Markdown preview-specific styles loaded in app.js)
		const dir = Setting.value('profileDir');
		const filename = Setting.custom_css_files.JOPLIN_APP;
		await CssUtils.injectCustomStyles(`${dir}/${filename}`);

		AlarmService.setDriver(new AlarmServiceDriverNode({ appName: packageInfo.build.appId }));
		AlarmService.setLogger(reg.logger());

		reg.setShowErrorMessageBoxHandler((message) => { bridge().showErrorMessageBox(message); });

		if (Setting.value('flagOpenDevTools')) {
			bridge().openDevTools();
		}

		PluginManager.instance().dispatch_ = this.dispatch.bind(this);
		PluginManager.instance().setLogger(reg.logger());
		PluginManager.instance().register(pluginClasses);

		this.updateMenu('Main');

		this.initRedux();

		// Since the settings need to be loaded before the store is created, it will never
		// receive the SETTING_UPDATE_ALL even, which mean state.settings will not be
		// initialised. So we manually call dispatchUpdateAll() to force an update.
		Setting.dispatchUpdateAll();

		await FoldersScreenUtils.refreshFolders();

		const tags = await Tag.allWithNotes();

		this.dispatch({
			type: 'TAG_UPDATE_ALL',
			items: tags,
		});

		const masterKeys = await MasterKey.all();

		this.dispatch({
			type: 'MASTERKEY_UPDATE_ALL',
			items: masterKeys,
		});

		this.store().dispatch({
			type: 'FOLDER_SELECT',
			id: Setting.value('activeFolderId'),
		});

		this.store().dispatch({
			type: 'FOLDER_SET_COLLAPSED_ALL',
			ids: Setting.value('collapsedFolderIds'),
		});

		// Loads custom Markdown preview styles
		const cssString = await CssUtils.loadCustomCss(`${Setting.value('profileDir')}/userstyle.css`);
		this.store().dispatch({
			type: 'LOAD_CUSTOM_CSS',
			css: cssString,
		});

		const templates = await TemplateUtils.loadTemplates(Setting.value('templateDir'));

		this.store().dispatch({
			type: 'TEMPLATE_UPDATE_ALL',
			templates: templates,
		});

		this.store().dispatch({
			type: 'NOTE_DEVTOOLS_SET',
			value: Setting.value('flagOpenDevTools'),
		});

		// Note: Auto-update currently doesn't work in Linux: it downloads the update
		// but then doesn't install it on exit.
		if (shim.isWindows() || shim.isMac()) {
			const runAutoUpdateCheck = () => {
				if (Setting.value('autoUpdateEnabled')) {
					bridge().checkForUpdates(true, bridge().window(), this.checkForUpdateLoggerPath(), { includePreReleases: Setting.value('autoUpdate.includePreReleases') });
				}
			};

			// Initial check on startup
			setTimeout(() => { runAutoUpdateCheck(); }, 5000);
			// Then every x hours
			setInterval(() => { runAutoUpdateCheck(); }, 12 * 60 * 60 * 1000);
		}

		this.updateTray();

		setTimeout(() => {
			AlarmService.garbageCollect();
		}, 1000 * 60 * 60);

		if (Setting.value('startMinimized') && Setting.value('showTrayIcon')) {
			// Keep it hidden
		} else {
			bridge().window().show();
		}

		ResourceService.runInBackground();

		if (Setting.value('env') === 'dev') {
			AlarmService.updateAllNotifications();
		} else {
			reg.scheduleSync().then(() => {
				// Wait for the first sync before updating the notifications, since synchronisation
				// might change the notifications.
				AlarmService.updateAllNotifications();

				DecryptionWorker.instance().scheduleStart();
			});
		}

		const clipperLogger = new Logger();
		clipperLogger.addTarget('file', { path: `${Setting.value('profileDir')}/log-clipper.txt` });
		clipperLogger.addTarget('console');

		ClipperServer.instance().setLogger(clipperLogger);
		ClipperServer.instance().setDispatch(this.store().dispatch);

		if (Setting.value('clipperServer.autoStart')) {
			ClipperServer.instance().start();
		}

		ExternalEditWatcher.instance().setLogger(reg.logger());
		ExternalEditWatcher.instance().dispatch = this.store().dispatch;

		RevisionService.instance().runInBackground();

		this.updateMenuItemStates();

		// Make it available to the console window - useful to call revisionService.collectRevisions()
		window.revisionService = RevisionService.instance();
		window.migrationService = MigrationService.instance();
		window.decryptionWorker = DecryptionWorker.instance();
	}

}

let application_ = null;

function app() {
	if (!application_) application_ = new Application();
	return application_;
}

module.exports = { app };
