import React, { Component } from 'react';
import { BackHandler, Keyboard } from 'react-native';
import { connect, Provider } from 'react-redux'
import { createStore } from 'redux';
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
import { ItemList } from 'lib/components/item-list.js'
import { NotesScreen } from 'lib/components/screens/notes.js'
import { NotesScreenUtils } from 'lib/components/screens/notes-utils.js'
import { NoteScreen } from 'lib/components/screens/note.js'
import { FolderScreen } from 'lib/components/screens/folder.js'
import { FoldersScreen } from 'lib/components/screens/folders.js'
import { LogScreen } from 'lib/components/screens/log.js'
import { StatusScreen } from 'lib/components/screens/status.js'
import { WelcomeScreen } from 'lib/components/screens/welcome.js'
import { OneDriveLoginScreen } from 'lib/components/screens/onedrive-login.js'
import { Setting } from 'lib/models/setting.js'
import { MenuContext } from 'react-native-popup-menu';
import { SideMenu } from 'lib/components/side-menu.js';
import { SideMenuContent } from 'lib/components/side-menu-content.js';
import { DatabaseDriverReactNative } from 'lib/database-driver-react-native';
import { reg } from 'lib/registry.js';
import { _, setLocale } from 'lib/locale.js';
import RNFetchBlob from 'react-native-fetch-blob';

let defaultState = {
	notes: [],
	folders: [],
	selectedNoteId: null,
	selectedItemType: 'note',
	selectedFolderId: null,
	showSideMenu: false,
	screens: {},
	loading: true,
	historyCanGoBack: false,
	notesOrder: {
		orderBy: 'updated_time',
		orderByDir: 'DESC',
	},
	syncStarted: false,
	syncReport: {},
};

const initialRoute = {
	type: 'Navigation/NAVIGATE',
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

const reducer = (state = defaultState, action) => {
	reg.logger().info('Reducer action', action.type);

	let newState = state;
	let historyGoingBack = false;

	try {
		switch (action.type) {


			case 'Navigation/BACK':

				if (!navHistory.length) break;

				let newAction = null;
				while (navHistory.length) {
					newAction = navHistory.pop();
					if (newAction.routeName != state.route.routeName) break;
				}

				action = newAction ? newAction : navHistory.pop();

				historyGoingBack = true;

				// Fall throught

			case 'Navigation/NAVIGATE':

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
				}

				if ('itemType' in action) {
					newState.selectedItemType = action.itemType;
				}

				newState.route = action;

				newState.historyCanGoBack = !!navHistory.length;

				if (newState.route.routeName == 'Notes') {
					Setting.setValue('activeFolderId', newState.selectedFolderId);
				}

				Keyboard.dismiss(); // TODO: should probably be in some middleware
				break;

			// Replace all the notes with the provided array
			case 'APPLICATION_LOADING_DONE':

				newState = Object.assign({}, state);
				newState.loading = false;
				break;

			// Replace all the notes with the provided array
			case 'NOTES_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.notes = action.notes;
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

				newNotes = Note.sortNotes(newNotes, state.notesOrder);
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

		}
	} catch (error) {
		error.message = 'In reducer: ' + error.message;
		throw error;
	}

	return newState;
}

let store = createStore(reducer);

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
	NotesScreenUtils.dispatch = dispatch;
	NotesScreenUtils.store = store;
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
			//await db.open({ name: 'joplin-56.sqlite' })
			await db.open({ name: 'joplin-56.sqlite' })

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

		// Setting.setValue('locale', 'fr_FR');
		// setLocale(Setting.value('locale'));

		reg.logger().info('Loading folders...');

		await FoldersScreenUtils.refreshFolders();

		dispatch({
			type: 'APPLICATION_LOADING_DONE',
		});

		let folderId = Setting.value('activeFolderId');
		let folder = await Folder.load(folderId);

		if (folder) {
			await NotesScreenUtils.openNoteList(folderId);
		} else {
			await NotesScreenUtils.openDefaultNoteList();
		}
	} catch (error) {
		reg.logger().error('Initialization error:', error);
	}

	BackHandler.addEventListener('hardwareBackPress', () => {
		return backButtonHandler();
	});

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
		if (Setting.value('env') == 'dev') {

		} else {
			reg.scheduleSync();
		}
	}

	backButtonHandler() {
		if (this.props.showSideMenu) {
			this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
			return true;
		}

		if (this.props.historyCanGoBack) {
			this.props.dispatch({ type: 'Navigation/BACK' });
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