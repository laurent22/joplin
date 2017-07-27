import React, { Component } from 'react';
import { BackHandler, Keyboard, NativeModules } from 'react-native';
import { connect, Provider } from 'react-redux'
import { createStore, applyMiddleware } from 'redux';
import { shimInit } from 'lib/shim-init-react.js';
import { Log } from 'lib/log.js'
import { AppNav } from 'lib/components/app-nav.js'
import { Logger } from 'lib/logger.js'
import { Note } from 'lib/models/note.js'
import { Folder } from 'lib/models/folder.js'
import { FoldersScreenUtils } from 'lib/components/screens/folders-utils.js';
import { Resource } from 'lib/models/resource.js'
import { Tag } from 'lib/models/tag.js'
import { NoteTag } from 'lib/models/note-tag.js'
import { BaseItem } from 'lib/models/base-item.js'
import { BaseModel } from 'lib/base-model.js'
import { JoplinDatabase } from 'lib/joplin-database.js'
import { Database } from 'lib/database.js'
import { NotesScreen } from 'lib/components/screens/notes.js'
import { NoteScreen } from 'lib/components/screens/note.js'
import { ConfigScreen } from 'lib/components/screens/config.js'
import { FolderScreen } from 'lib/components/screens/folder.js'
import { LogScreen } from 'lib/components/screens/log.js'
import { StatusScreen } from 'lib/components/screens/status.js'
import { WelcomeScreen } from 'lib/components/screens/welcome.js'
import { SearchScreen } from 'lib/components/screens/search.js'
import { OneDriveLoginScreen } from 'lib/components/screens/onedrive-login.js'
import { Setting } from 'lib/models/setting.js'
import { MenuContext } from 'react-native-popup-menu';
import { SideMenu } from 'lib/components/side-menu.js';
import { SideMenuContent } from 'lib/components/side-menu-content.js';
import { DatabaseDriverReactNative } from 'lib/database-driver-react-native';
import { reg } from 'lib/registry.js';
import { _, setLocale, closestSupportedLocale, defaultLocale } from 'lib/locale.js';
import RNFetchBlob from 'react-native-fetch-blob';
import { PoorManIntervals } from 'lib/poor-man-intervals.js';

let defaultState = {
	notes: [],
	notesSource: '',
	notesParentType: null,
	folders: [],
	tags: [],
	selectedNoteId: null,
	selectedFolderId: null,
	selectedTagId: null,
	selectedItemType: 'note',
	showSideMenu: false,
	screens: {},
	loading: true,
	historyCanGoBack: false,
	notesOrder: [
		{ by: 'updated_time', dir: 'DESC' },
	],
	syncStarted: false,
	syncReport: {},
	searchQuery: '',
	settings: {},
};

const initialRoute = {
	type: 'NAV_GO',
	routeName: 'Welcome',
	params: {}
};

defaultState.route = initialRoute;

let navHistory = [];

function historyCanGoBackTo(route) {
	if (route.routeName == 'Note') return false;
	if (route.routeName == 'Folder') return false;

	return true;
}

function reducerActionsAreSame(a1, a2) {
	if (Object.getOwnPropertyNames(a1).length !== Object.getOwnPropertyNames(a2).length) return false;

	for (let n in a1) {
		if (!a1.hasOwnProperty(n)) continue;
		if (a1[n] !== a2[n]) return false;
	}

	return true;
}

function updateStateFromSettings(action, newState) {
	// if (action.type == 'SETTINGS_UPDATE_ALL' || action.key == 'uncompletedTodosOnTop') {
	// 	let newNotesOrder = [];
	// 	for (let i = 0; i < newState.notesOrder.length; i++) {
	// 		const o = newState.notesOrder[i];
	// 		if (o.by == 'is_todo') continue;
	// 		newNotesOrder.push(o);
	// 	}

	// 	if (newState.settings['uncompletedTodosOnTop']) {
	// 		newNotesOrder.unshift({ by: 'is_todo', dir: 'DESC' });
	// 	}

	// 	newState.notesOrder = newNotesOrder;

	// 	console.info('NEW', newNotesOrder);
	// }

	return newState;
}

const reducer = (state = defaultState, action) => {
	let newState = state;
	let historyGoingBack = false;

	try {
		switch (action.type) {


			case 'NAV_BACK':

				if (!navHistory.length) break;

				let newAction = null;
				while (navHistory.length) {
					newAction = navHistory.pop();
					if (newAction.routeName != state.route.routeName) break;
				}

				action = newAction ? newAction : navHistory.pop();

				historyGoingBack = true;

				// Fall throught

			case 'NAV_GO':

				const currentRoute = state.route;
				const currentRouteName = currentRoute ? currentRoute.routeName : '';

				if (!historyGoingBack && historyCanGoBackTo(currentRoute)) {
					// If the route *name* is the same (even if the other parameters are different), we
					// overwrite the last route in the history with the current one. If the route name
					// is different, we push a new history entry.
					if (currentRoute.routeName == action.routeName) {
						// nothing
					} else {
						navHistory.push(currentRoute);
					}
				}

				// HACK: whenever a new screen is loaded, all the previous screens of that type
				// are overwritten with the new screen parameters. This is because the way notes
				// are currently loaded is not optimal (doesn't retain history properly) so
				// this is a simple fix without doing a big refactoring to change the way notes
				// are loaded. Might be good enough since going back to different folders
				// is probably not a common workflow.
				for (let i = 0; i < navHistory.length; i++) {
					let n = navHistory[i];
					if (n.routeName == action.routeName) {
						navHistory[i] = Object.assign({}, action);
					}
				}

				if (action.routeName == 'Welcome') navHistory = [];

				reg.logger().info('Route: ' + currentRouteName + ' => ' + action.routeName);

				newState = Object.assign({}, state);

				if ('noteId' in action) {
					newState.selectedNoteId = action.noteId;
				}

				if ('folderId' in action) {
					newState.selectedFolderId = action.folderId;
					newState.notesParentType = 'Folder';
				}

				if ('tagId' in action) {
					newState.selectedTagId = action.tagId;
					newState.notesParentType = 'Tag';
				}

				if ('itemType' in action) {
					newState.selectedItemType = action.itemType;
				}

				newState.route = action;
				newState.historyCanGoBack = !!navHistory.length;
				break;

			// Replace all the notes with the provided array
			case 'APPLICATION_LOADING_DONE':

				newState = Object.assign({}, state);
				newState.loading = false;
				break;

			case 'SETTINGS_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.settings = action.settings;
				newState = updateStateFromSettings(action, newState);
				break;

			case 'SETTINGS_UPDATE_ONE':

				newState = Object.assign({}, state);
				let newSettings = Object.assign({}, state.settings);
				newSettings[action.key] = action.value;
				newState.settings = newSettings;
				newState = updateStateFromSettings(action, newState);
				break;

			// Replace all the notes with the provided array
			case 'NOTES_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.notes = action.notes;
				newState.notesSource = action.notesSource;
				break;

			// Insert the note into the note list if it's new, or
			// update it within the note array if it already exists.
			case 'NOTES_UPDATE_ONE':

				const modNote = action.note;

				let newNotes = state.notes.splice(0);
				var found = false;
				for (let i = 0; i < newNotes.length; i++) {
					let n = newNotes[i];
					if (n.id == modNote.id) {

						if (!('parent_id' in modNote) || modNote.parent_id == n.parent_id) {
							// Merge the properties that have changed (in modNote) into
							// the object we already have.
							newNotes[i] = Object.assign(newNotes[i], action.note);
						} else {
							newNotes.splice(i, 1);
						}
						found = true;
						break;
					}
				}

				if (!found && ('parent_id' in modNote) && modNote.parent_id == state.selectedFolderId) newNotes.push(modNote);

				newNotes = Note.sortNotes(newNotes, state.notesOrder, newState.settings.uncompletedTodosOnTop);
				newState = Object.assign({}, state);
				newState.notes = newNotes;
				break;

			case 'NOTES_DELETE':

				var newNotes = [];
				for (let i = 0; i < state.notes.length; i++) {
					let f = state.notes[i];
					if (f.id == action.noteId) continue;
					newNotes.push(f);
				}

				newState = Object.assign({}, state);
				newState.notes = newNotes;
				break;

			case 'FOLDERS_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.folders = action.folders;
				break;

			case 'TAGS_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.tags = action.tags;
				break;				

			case 'FOLDERS_UPDATE_ONE':

				var newFolders = state.folders.splice(0);
				var found = false;
				for (let i = 0; i < newFolders.length; i++) {
					let n = newFolders[i];
					if (n.id == action.folder.id) {
						newFolders[i] = Object.assign(newFolders[i], action.folder);
						found = true;
						break;
					}
				}

				if (!found) newFolders.push(action.folder);

				newState = Object.assign({}, state);
				newState.folders = newFolders;
				break;

			case 'FOLDER_DELETE':

				var newFolders = [];
				for (let i = 0; i < state.folders.length; i++) {
					let f = state.folders[i];
					if (f.id == action.folderId) continue;
					newFolders.push(f);
				}

				newState = Object.assign({}, state);
				newState.folders = newFolders;
				break;

			case 'SIDE_MENU_TOGGLE':

				newState = Object.assign({}, state);
				newState.showSideMenu = !newState.showSideMenu
				break;

			case 'SIDE_MENU_OPEN':

				newState = Object.assign({}, state);
				newState.showSideMenu = true
				break;

			case 'SIDE_MENU_CLOSE':

				newState = Object.assign({}, state);
				newState.showSideMenu = false
				break;

			case 'SYNC_STARTED':

				newState = Object.assign({}, state);
				newState.syncStarted = true;
				break;

			case 'SYNC_COMPLETED':

				newState = Object.assign({}, state);
				newState.syncStarted = false;
				break;

			case 'SYNC_REPORT_UPDATE':

				newState = Object.assign({}, state);
				newState.syncReport = action.report;
				break;

			case 'SEARCH_QUERY':

				newState = Object.assign({}, state);
				newState.searchQuery = action.query.trim();

		}
	} catch (error) {
		error.message = 'In reducer: ' + error.message + ' Action: ' + JSON.stringify(action);
		throw error;
	}

	return newState;
}

const generalMiddleware = store => next => async (action) => {
	reg.logger().info('Reducer action', action.type);
	PoorManIntervals.update(); // This function needs to be called regularly so put it here

	const result = next(action);
	const newState = store.getState();

	if (action.type == 'NAV_GO') Keyboard.dismiss();

	if (['NOTES_UPDATE_ONE', 'NOTES_DELETE', 'FOLDERS_UPDATE_ONE', 'FOLDER_DELETE'].indexOf(action.type) >= 0) {
		if (!await reg.syncStarted()) reg.scheduleSync();
	}

	if (action.type == 'SETTINGS_UPDATE_ONE' && action.key == 'sync.interval' || action.type == 'SETTINGS_UPDATE_ALL') {
		reg.setupRecurrentSync();
	}

	if (action.type == 'NAV_GO' && action.routeName == 'Notes') {
		Setting.setValue('activeFolderId', newState.selectedFolderId);
	}

  	return result;
}

let store = createStore(reducer, applyMiddleware(generalMiddleware));

let initializationState_ = 'waiting';

async function initialize(dispatch, backButtonHandler) {
	if (initializationState_ != 'waiting') return;

	shimInit();

	initializationState_ = 'in_progress';

	Setting.setConstant('env', __DEV__ ? 'dev' : 'prod');
	Setting.setConstant('appId', 'net.cozic.joplin');
	Setting.setConstant('appType', 'mobile');
	Setting.setConstant('resourceDir', RNFetchBlob.fs.dirs.DocumentDir);

	const logDatabase = new Database(new DatabaseDriverReactNative());
	await logDatabase.open({ name: 'log.sqlite' });
	await logDatabase.exec(Logger.databaseCreateTableSql());

	const mainLogger = new Logger();
	mainLogger.addTarget('database', { database: logDatabase, source: 'm' });
	if (Setting.value('env') == 'dev') mainLogger.addTarget('console');
	mainLogger.setLevel(Logger.LEVEL_DEBUG);

	reg.setLogger(mainLogger);

	reg.logger().info('====================================');
	reg.logger().info('Starting application ' + Setting.value('appId') + ' (' + Setting.value('env') + ')');

	const dbLogger = new Logger();
	dbLogger.addTarget('database', { database: logDatabase, source: 'm' }); 
	if (Setting.value('env') == 'dev') {
		dbLogger.addTarget('console');
		dbLogger.setLevel(Logger.LEVEL_INFO); // Set to LEVEL_DEBUG for full SQL queries
	} else {
		dbLogger.setLevel(Logger.LEVEL_INFO);
	}

	let db = new JoplinDatabase(new DatabaseDriverReactNative());
	db.setLogger(dbLogger);
	reg.setDb(db);

	reg.dispatch = dispatch;
	BaseModel.dispatch = dispatch;
	FoldersScreenUtils.dispatch = dispatch;
	BaseModel.db_ = db;

	BaseItem.loadClass('Note', Note);
	BaseItem.loadClass('Folder', Folder);
	BaseItem.loadClass('Resource', Resource);
	BaseItem.loadClass('Tag', Tag);
	BaseItem.loadClass('NoteTag', NoteTag);

	try {
		if (Setting.value('env') == 'prod') {
			await db.open({ name: 'joplin.sqlite' })
		} else {
			await db.open({ name: 'joplin-66.sqlite' })
			//await db.open({ name: 'joplin-67.sqlite' })

			// await db.exec('DELETE FROM notes');
			// await db.exec('DELETE FROM folders');
			// await db.exec('DELETE FROM tags');
			// await db.exec('DELETE FROM note_tags');
			// await db.exec('DELETE FROM resources');
			// await db.exec('DELETE FROM deleted_items');

			// await db.exec('UPDATE notes SET is_conflict = 1 where id like "546f%"');
		}

		reg.logger().info('Database is ready.');
		reg.logger().info('Loading settings...');
		await Setting.load();

		if (Setting.value('firstStart')) {
			const locale = NativeModules.I18nManager.localeIdentifier
			if (!locale) locale = defaultLocale();
			Setting.setValue('locale', closestSupportedLocale(locale));
			Setting.setValue('firstStart', 0)
		}

		setLocale(Setting.value('locale'));

		reg.logger().info('Loading folders...');

		await FoldersScreenUtils.refreshFolders();

		const tags = await Tag.all();

		dispatch({
			type: 'TAGS_UPDATE_ALL',
			tags: tags,
		});

		dispatch({
			type: 'APPLICATION_LOADING_DONE',
		});

		let folderId = Setting.value('activeFolderId');
		let folder = await Folder.load(folderId);

		if (!folder) folder = await Folder.defaultFolder();

		if (!folder) {
			dispatch({
				type: 'NAV_GO',
				routeName: 'Welcome',
			});
		} else {
			dispatch({
				type: 'NAV_GO',
				routeName: 'Notes',
				folderId: folder.id,
			});
		}
	} catch (error) {
		reg.logger().error('Initialization error:', error);
	}

	BackHandler.addEventListener('hardwareBackPress', () => {
		return backButtonHandler();
	});

	reg.setupRecurrentSync();

	if (Setting.value('env') == 'dev') {

	} else {
		reg.scheduleSync();
	}

	initializationState_ = 'done';

	reg.logger().info('Application initialized');
}

class AppComponent extends React.Component {

	constructor() {
		super();
		this.lastSyncStarted_ = defaultState.syncStarted;
	}

	async componentDidMount() {
		await initialize(this.props.dispatch, this.backButtonHandler.bind(this));
	}

	backButtonHandler() {
		if (this.props.showSideMenu) {
			this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
			return true;
		}

		if (this.props.historyCanGoBack) {
			this.props.dispatch({ type: 'NAV_BACK' });
			return true;
		}

		return false;
	}

	componentWillReceiveProps(newProps) {
		if (newProps.syncStarted != this.lastSyncStarted_) {
			if (!newProps.syncStarted) FoldersScreenUtils.refreshFolders();
			this.lastSyncStarted_ = newProps.syncStarted;
		}
	}

	sideMenu_change(isOpen) {
		// Make sure showSideMenu property of state is updated
		// when the menu is open/closed.
		this.props.dispatch({
			type: isOpen ? 'SIDE_MENU_OPEN' : 'SIDE_MENU_CLOSE',
		});
	}

	render() {
		const sideMenuContent = <SideMenuContent/>;

		const appNavInit = {
			Welcome: { screen: WelcomeScreen },
			Notes: { screen: NotesScreen },
			Note: { screen: NoteScreen },
			Folder: { screen: FolderScreen },
			OneDriveLogin: { screen: OneDriveLoginScreen },
			Log: { screen: LogScreen },
			Status: { screen: StatusScreen },
			Search: { screen: SearchScreen },
			Config: { screen: ConfigScreen },
		};

		return (
			<SideMenu menu={sideMenuContent} onChange={(isOpen) => this.sideMenu_change(isOpen)}>
				<MenuContext style={{ flex: 1 }}>
					<AppNav screens={appNavInit} />
				</MenuContext>
			</SideMenu>
		);
	}
}

const mapStateToProps = (state) => {
	return {
  		historyCanGoBack: state.historyCanGoBack,
  		showSideMenu: state.showSideMenu,
  		syncStarted: state.syncStarted,
  	};
};

const App = connect(mapStateToProps)(AppComponent);

class Root extends React.Component {
	render() {
		return (
			<Provider store={store}>
				<App/>
			</Provider>
		);
	}
}

export { Root };