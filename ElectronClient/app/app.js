require('app-module-path').addPath(__dirname);

const { BaseApplication } = require('lib/BaseApplication');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const { Setting } = require('lib/models/setting.js');
const { shim } = require('lib/shim.js');
const { BaseModel } = require('lib/base-model.js');
const { _, setLocale } = require('lib/locale.js');
const os = require('os');
const fs = require('fs-extra');
const { Tag } = require('lib/models/tag.js');
const { reg } = require('lib/registry.js');
const { sprintf } = require('sprintf-js');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
const { ElectronAppWrapper } = require('./ElectronAppWrapper');
const { defaultState } = require('lib/reducer.js');

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

		if (['NOTE_UPDATE_ONE', 'NOTE_DELETE', 'FOLDER_UPDATE_ONE', 'FOLDER_DELETE'].indexOf(action.type) >= 0) {
			if (!await reg.syncStarted()) reg.scheduleSync();
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
					screens: ['Main'],
					click: () => {
						this.dispatch({
							type: 'WINDOW_COMMAND',
							name: 'newNotebook',
						});
					}
				}, {
					type: 'separator',
				}, {
					label: _('Import Evernote notes'),
					click: () => {
						const filePaths = bridge().showOpenDialog({
							properties: ['openFile', 'createDirectory'],
							filters: [
								{ name: _('Evernote Export Files'), extensions: ['enex'] },
							]
						});
						if (!filePaths || !filePaths.length) return;

						this.dispatch({
							type: 'NAV_GO',
							routeName: 'Import',
							props: {
								filePath: filePaths[0],
							},
						});
					}
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
					screens: ['Main'],
					role: 'copy',
					accelerator: 'CommandOrControl+C',
				}, {
					label: _('Cut'),
					screens: ['Main'],
					role: 'copy',
					accelerator: 'CommandOrControl+X',
				}, {
					label: _('Paste'),
					screens: ['Main'],
					role: 'copy',
					accelerator: 'CommandOrControl+V',
				}, {
					type: 'separator',
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
				}]
			}, {
				label: _('Tools'),
				submenu: [{
					label: _('Options'),
					click: () => {
						this.dispatch({
							type: 'NAV_GO',
							routeName: 'Config',
						});
					}
				}]
			}, {
				label: _('Help'),
				submenu: [{
					label: _('Website and documentation'),
					accelerator: 'F1',
					click () { bridge().openExternal('http://joplin.cozic.net') }
				}, {
					label: _('About Joplin'),
					click: () => {
						const p = require('./package.json');
						let message = [
							p.description,
							'',
							'Copyright © 2016-2017 Laurent Cozic',
							_('%s %s (%s, %s)', p.name, p.version, Setting.value('env'), process.platform),
						];
						bridge().showMessageBox({
							message: message.join('\n'),
						});
					}
				}]
			},
		];

		function removeUnwantedItems(template, screen) {
			let output = [];
			for (let i = 0; i < template.length; i++) {
				const t = Object.assign({}, template[i]);
				if (t.screens && t.screens.indexOf(screen) < 0) continue;
				if (t.submenu) t.submenu = removeUnwantedItems(t.submenu, screen);
				output.push(t);
			}
			return output;
		}

		let screenTemplate = removeUnwantedItems(template, screen);

		const menu = Menu.buildFromTemplate(screenTemplate);
		Menu.setApplicationMenu(menu);

		this.lastMenuScreen_ = screen;
	}

	async start(argv) {
		argv = await super.start(argv);

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
			tags: tags,
		});

		this.store().dispatch({
			type: 'FOLDER_SELECT',
			id: Setting.value('activeFolderId'),
		});

		// Note: Auto-update currently doesn't work in Linux: it downloads the update
		// but then doesn't install it on exit.
		if (shim.isWindows() || shim.isMac()) {
			const runAutoUpdateCheck = function() {
				if (Setting.value('autoUpdateEnabled')) {
					bridge().checkForUpdatesAndNotify(Setting.value('profileDir') + '/log-autoupdater.txt');
				}
			}
			
			setTimeout(() => { runAutoUpdateCheck() }, 5000);
			// For those who leave the app always open
			setInterval(() => { runAutoUpdateCheck() }, 2 * 60 * 60 * 1000);
		}

		reg.scheduleSync();
	}

}

let application_ = null;

function app() {
	if (!application_) application_ = new Application();
	return application_;
}

module.exports = { app };