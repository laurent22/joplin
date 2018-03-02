require('app-module-path').addPath(__dirname);

const { BaseApplication } = require('lib/BaseApplication');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const Setting = require('lib/models/Setting.js');
const { shim } = require('lib/shim.js');
const BaseModel = require('lib/BaseModel.js');
const MasterKey = require('lib/models/MasterKey');
const { _, setLocale } = require('lib/locale.js');
const os = require('os');
const fs = require('fs-extra');
const Tag = require('lib/models/Tag.js');
const { reg } = require('lib/registry.js');
const { sprintf } = require('sprintf-js');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
const { ElectronAppWrapper } = require('./ElectronAppWrapper');
const { defaultState } = require('lib/reducer.js');
const packageInfo = require('./packageInfo.js');
const AlarmService = require('lib/services/AlarmService.js');
const AlarmServiceDriverNode = require('lib/services/AlarmServiceDriverNode');
const DecryptionWorker = require('lib/services/DecryptionWorker');
const InteropService = require('lib/services/InteropService');
const InteropServiceHelper = require('./InteropServiceHelper.js');

const { bridge } = require('electron').remote.require('./bridge');
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;

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
	windowContentSize: bridge().windowContentSize(),
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
		return Setting.value('profileDir') + '/log-autoupdater.txt';
	}

	reducer(state = appDefaultState, action) {
		let newState = state;

		try {
			switch (action.type) {

				case 'NAV_BACK':
				case 'NAV_GO':

					const goingBack = action.type === 'NAV_BACK';

					if (goingBack && !state.navHistory.length) break;

					const currentRoute = state.route;

					newState = Object.assign({}, state);
					let newNavHistory = state.navHistory.slice();

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
					newState.navHistory = newNavHistory
					newState.route = action;
					break;

				case 'WINDOW_CONTENT_SIZE_SET':

					newState = Object.assign({}, state);
					newState.windowContentSize = action.size;
					break;

				case 'WINDOW_COMMAND':

					newState = Object.assign({}, state);
					let command = Object.assign({}, action);
					delete command.type;
					newState.windowCommand = command;
					break;

				case 'NOTE_VISIBLE_PANES_TOGGLE':

					let panes = state.noteVisiblePanes.slice();
					if (panes.length === 2) {
						panes = ['editor'];
					} else if (panes.indexOf('editor') >= 0) {
						panes = ['viewer'];
					} else if (panes.indexOf('viewer') >= 0) {
						panes = ['editor', 'viewer'];
					} else {
						panes = ['editor', 'viewer'];
					}

					newState = Object.assign({}, state);
					newState.noteVisiblePanes = panes;
					break;

				case 'NOTE_VISIBLE_PANES_SET':
				
					newState = Object.assign({}, state);
					newState.noteVisiblePanes = action.panes;
					break;

			}
		} catch (error) {
			error.message = 'In reducer: ' + error.message + ' Action: ' + JSON.stringify(action);
			throw error;
		}

		return super.reducer(newState, action);
	}

	async generalMiddleware(store, next, action) {
		if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'locale' || action.type == 'SETTING_UPDATE_ALL') {
			setLocale(Setting.value('locale'));
			this.refreshMenu();
		}

		if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'showTrayIcon' || action.type == 'SETTING_UPDATE_ALL') {
			this.updateTray();
		}

		if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'style.editor.fontFamily' || action.type == 'SETTING_UPDATE_ALL') {
			this.updateEditorFont();
		}

		if (['NOTE_UPDATE_ONE', 'NOTE_DELETE', 'FOLDER_UPDATE_ONE', 'FOLDER_DELETE'].indexOf(action.type) >= 0) {
			if (!await reg.syncTarget().syncStarted()) reg.scheduleSync();
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

		return result;
	}

	refreshMenu() {
		const screen = this.lastMenuScreen_;
		this.lastMenuScreen_ = null;
		this.updateMenu(screen);
	}

	updateMenu(screen) {
		if (this.lastMenuScreen_ === screen) return;

		const sortNoteItems = [];
		const sortNoteOptions = Setting.enumOptions('notes.sortOrder.field');
		for (let field in sortNoteOptions) {
			if (!sortNoteOptions.hasOwnProperty(field)) continue;
			sortNoteItems.push({
				label: sortNoteOptions[field],
				screens: ['Main'],
				type: 'checkbox',
				checked: Setting.value('notes.sortOrder.field') === field,
				click: () => {
					Setting.setValue('notes.sortOrder.field', field);
					this.refreshMenu();
				}
			});		
		}

		const importItems = [];
		const exportItems = [];
		const ioService = new InteropService();
		const ioModules = ioService.modules();
		for (let i = 0; i < ioModules.length; i++) {
			const module = ioModules[i];
			if (module.type === 'exporter') {
				exportItems.push({
					label: module.format + ' - ' + module.description,
					screens: ['Main'],
					click: async () => {
						await InteropServiceHelper.export(this.dispatch.bind(this), module);
					}
				});
			} else {
				for (let j = 0; j < module.sources.length; j++) {
					const moduleSource = module.sources[j];
					let label = [module.format + ' - ' + module.description];
					if (module.sources.length > 1) {
						label.push('(' + (moduleSource === 'file' ? _('File') : _('Directory')) + ')');
					}
					importItems.push({
						label: label.join(' '),
						screens: ['Main'],
						click: async () => {
							let path = null;

							const selectedFolderId = this.store().getState().selectedFolderId;

							if (moduleSource === 'file') {
								path = bridge().showOpenDialog({
									filters: [{ name: module.description, extensions: [module.fileExtension]}]
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

							const importOptions = {};
							importOptions.path = path;
							importOptions.format = module.format;
							importOptions.destinationFolderId = !module.isNoteArchive && moduleSource === 'file' ? selectedFolderId : null;

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
						}
					});
				}
			}
		}

		const template = [
			{
				label: _('File'),
				submenu: [{
					label: _('New note'),
					accelerator: 'CommandOrControl+N',
					screens: ['Main'],
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'newNote',
						});
					}
				}, {
					label: _('New to-do'),
					accelerator: 'CommandOrControl+T',
					screens: ['Main'],
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'newTodo',
						});
					}
				}, {
					label: _('New notebook'),
					accelerator: 'CommandOrControl+B',
					screens: ['Main'],
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'newNotebook',
						});
					}
				}, {
					type: 'separator',
				// }, {
				// 	label: _('Import Evernote notes'),
				// 	click: () => {
				// 		const filePaths = bridge().showOpenDialog({
				// 			properties: ['openFile', 'createDirectory'],
				// 			filters: [
				// 				{ name: _('Evernote Export Files'), extensions: ['enex'] },
				// 			]
				// 		});
				// 		if (!filePaths || !filePaths.length) return;

				// 		this.dispatch({
				// 			type: 'NAV_GO',
				// 			routeName: 'Import',
				// 			props: {
				// 				filePath: filePaths[0],
				// 			},
				// 		});
				// 	}
				}, {
					label: _('Import'),
					submenu: importItems,
				}, {
					label: _('Export'),
					submenu: exportItems,
				}, {
					type: 'separator',
					platforms: ['darwin'],
				}, {
					label: _('Hide %s', 'Joplin'),
					platforms: ['darwin'],
					accelerator: 'CommandOrControl+H',
					click: () => { bridge().electronApp().hide() }
				}, {
					type: 'separator',
				}, {
					label: _('Quit'),
					accelerator: 'CommandOrControl+Q',
					click: () => { bridge().electronApp().exit() }
				}]
			}, {
				label: _('Edit'),
				submenu: [{
					label: _('Copy'),
					screens: ['Main', 'OneDriveLogin', 'Config', 'EncryptionConfig'],
					role: 'copy',
					accelerator: 'CommandOrControl+C',
				}, {
					label: _('Cut'),
					screens: ['Main', 'OneDriveLogin', 'Config', 'EncryptionConfig'],
					role: 'cut',
					accelerator: 'CommandOrControl+X',
				}, {
					label: _('Paste'),
					screens: ['Main', 'OneDriveLogin', 'Config', 'EncryptionConfig'],
					role: 'paste',
					accelerator: 'CommandOrControl+V',
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					label: _('Search in all the notes'),
					screens: ['Main'],
					accelerator: 'F6',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'search',
						});
					},
				}],
			}, {
				label: _('View'),
				submenu: [{
					label: _('Toggle editor layout'),
					screens: ['Main'],
					accelerator: 'CommandOrControl+L',
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'toggleVisiblePanes',
						});
					}
				}, {
					type: 'separator',
					screens: ['Main'],
				}, {
					label: Setting.settingMetadata('notes.sortOrder.field').label(),
					screens: ['Main'],
					submenu: sortNoteItems,
				}, {
					label: Setting.settingMetadata('notes.sortOrder.reverse').label(),
					type: 'checkbox',
					checked: Setting.value('notes.sortOrder.reverse'),
					screens: ['Main'],
					click: () => {
						Setting.setValue('notes.sortOrder.reverse', !Setting.value('notes.sortOrder.reverse'));
					},
				}, {
					label: Setting.settingMetadata('uncompletedTodosOnTop').label(),
					type: 'checkbox',
					checked: Setting.value('uncompletedTodosOnTop'),
					screens: ['Main'],
					click: () => {
						Setting.setValue('uncompletedTodosOnTop', !Setting.value('uncompletedTodosOnTop'));
					},
				}],
			}, {
				label: _('Tools'),
				submenu: [{
					label: _('Synchronisation status'),
					click: () => {
						this.dispatch({
							type: 'NAV_GO',
							routeName: 'Status',
						});
					}
				}, {
					type: 'separator',
					screens: ['Main'],
				},{
					label: _('Encryption options'),
					click: () => {
						this.dispatch({
							type: 'NAV_GO',
							routeName: 'EncryptionConfig',
						});
					}
				},{
					label: _('General Options'),
					accelerator: 'CommandOrControl+,',
					click: () => {
						this.dispatch({
							type: 'NAV_GO',
							routeName: 'Config',
						});
					}
				}],
			}, {
				label: _('Help'),
				submenu: [{
					label: _('Website and documentation'),
					accelerator: 'F1',
					click () { bridge().openExternal('http://joplin.cozic.net') }
				}, {
					label: _('Check for updates...'),
					click: () => {
						bridge().checkForUpdates(false, bridge().window(), this.checkForUpdateLoggerPath());
					}
				}, {
					label: _('About Joplin'),
					click: () => {
						const p = packageInfo;
						let message = [
							p.description,
							'',
							'Copyright © 2016-2018 Laurent Cozic',
							_('%s %s (%s, %s)', p.name, p.version, Setting.value('env'), process.platform),
						];
						bridge().showInfoMessageBox(message.join('\n'), {
							icon: bridge().electronApp().buildDir() + '/icons/32x32.png',
						});
					}
				}]
			},
		];

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
			return output;
		}

		let screenTemplate = removeUnwantedItems(template, screen);

		const menu = Menu.buildFromTemplate(screenTemplate);
		Menu.setApplicationMenu(menu);

		this.lastMenuScreen_ = screen;
	}

	updateTray() {
		// Tray icon (called AppIndicator) doesn't work in Ubuntu
		// http://www.webupd8.org/2017/04/fix-appindicator-not-working-for.html
		// Might be fixed in Electron 18.x but no non-beta release yet.
		if (!shim.isWindows() && !shim.isMac()) return;

		const app = bridge().electronApp();

		if (app.trayShown() === Setting.value('showTrayIcon')) return;

		if (!Setting.value('showTrayIcon')) {
			app.destroyTray();
		} else {
			const contextMenu = Menu.buildFromTemplate([
				{ label: _('Open %s', app.electronApp().getName()), click: () => { app.window().show(); } },
				{ type: 'separator' },
				{ label: _('Exit'), click: () => { app.exit() } },
			])
			app.createTray(contextMenu);
		}
	}

	updateEditorFont() {
		const fontFamilies = [];
		if (Setting.value('style.editor.fontFamily')) fontFamilies.push('"' + Setting.value('style.editor.fontFamily') + '"');
		fontFamilies.push('monospace');

		// The '*' and '!important' parts are necessary to make sure Russian text is displayed properly
		// https://github.com/laurent22/joplin/issues/155

		const css = '.ace_editor * { font-family: ' + fontFamilies.join(', ') + ' !important; }';
		const styleTag = document.createElement('style');
		styleTag.type = 'text/css';
		styleTag.appendChild(document.createTextNode(css));
		document.head.appendChild(styleTag);
	}

	async start(argv) {
		argv = await super.start(argv);

		AlarmService.setDriver(new AlarmServiceDriverNode({ appName: packageInfo.build.appId }));
		AlarmService.setLogger(reg.logger());

		reg.setShowErrorMessageBoxHandler((message) => { bridge().showErrorMessageBox(message) });

		if (Setting.value('openDevTools')) {
			bridge().window().webContents.openDevTools();
		}

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

		// Note: Auto-update currently doesn't work in Linux: it downloads the update
		// but then doesn't install it on exit.
		if (shim.isWindows() || shim.isMac()) {
			const runAutoUpdateCheck = () => {
				if (Setting.value('autoUpdateEnabled')) {
					bridge().checkForUpdates(true, bridge().window(), this.checkForUpdateLoggerPath());
				}
			}
			
			// Initial check on startup
			setTimeout(() => { runAutoUpdateCheck() }, 5000);
			// Then every x hours
			setInterval(() => { runAutoUpdateCheck() }, 12 * 60 * 60 * 1000);
		}

		this.updateTray();

		setTimeout(() => {
			AlarmService.garbageCollect();
		}, 1000 * 60 * 60);

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
	}

}

let application_ = null;

function app() {
	if (!application_) application_ = new Application();
	return application_;
}

module.exports = { app };