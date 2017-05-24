import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Provider } from 'react-redux'
import { createStore } from 'redux';
import { combineReducers } from 'redux';
import { StackNavigator } from 'react-navigation';
import { addNavigationHelpers } from 'react-navigation';
import { Log } from 'src/log.js'
import { Note } from 'src/models/note.js'
import { Folder } from 'src/models/folder.js'
import { BaseModel } from 'src/base-model.js'
import { Database } from 'src/database.js'
import { Registry } from 'src/registry.js'
import { ItemList } from 'src/components/item-list.js'
import { NotesScreen } from 'src/components/screens/notes.js'
import { NoteScreen } from 'src/components/screens/note.js'
import { FolderScreen } from 'src/components/screens/folder.js'
import { FoldersScreen } from 'src/components/screens/folders.js'
import { LoginScreen } from 'src/components/screens/login.js'
import { LoadingScreen } from 'src/components/screens/loading.js'
import { Setting } from 'src/models/setting.js'
import { Synchronizer } from 'src/synchronizer.js'
import { MenuContext } from 'react-native-popup-menu';
import { SideMenu } from 'src/components/side-menu.js';
import { SideMenuContent } from 'src/components/side-menu-content.js';
import { NoteFolderService } from 'src/services/note-folder-service.js';

let defaultState = {
	notes: [],
	folders: [],
	selectedNoteId: null,
	selectedFolderId: null,
	user: { email: 'laurent@cozic.net', session: null },
	showSideMenu: false,
};

const reducer = (state = defaultState, action) => {
	Log.info('Reducer action', action.type);

	let newState = state;

	switch (action.type) {

		case 'Navigation/NAVIGATE':
		case 'Navigation/BACK':

			const r = state.nav.routes;
			const currentRoute = r.length ? r[r.length - 1] : null;
			const currentRouteName = currentRoute ? currentRoute.routeName : '';

			Log.info('Current route name', currentRouteName);
			Log.info('New route name', action.routeName);

			newState = Object.assign({}, state);

			if ('noteId' in action) {
				newState.selectedNoteId = action.noteId;
			}

			if ('folderId' in action) {
				newState.selectedFolderId = action.folderId;
			}

			if (currentRouteName == action.routeName) {
				// If the current screen is already the requested screen, don't do anything
			} else {
				const nextStateNav = AppNavigator.router.getStateForAction(action, currentRouteName != 'Loading' ? state.nav : null);
				if (nextStateNav) {
					newState.nav = nextStateNav;
				}
			}

			break;

		// Replace all the notes with the provided array
		case 'NOTES_UPDATE_ALL':

			newState = Object.assign({}, state);
			newState.notes = action.notes;
			break;

		// Insert the note into the note list if it's new, or
		// update it within the note array if it already exists.
		case 'NOTES_UPDATE_ONE':

			let newNotes = state.notes.splice(0);
			var found = false;
			for (let i = 0; i < newNotes.length; i++) {
				let n = newNotes[i];
				if (n.id == action.note.id) {
					newNotes[i] = action.note;
					found = true;
					break;
				}
			}

			if (!found) newNotes.push(action.note);

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
					newFolders[i] = action.folder;
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

		case 'USER_SET':

			newState = Object.assign({}, state);
			newState.user = action.user;
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

	}

	// Log.info('newState.selectedFolderId', newState.selectedFolderId);

	return newState;
}

let store = createStore(reducer);

const AppNavigator = StackNavigator({
	Notes: { screen: NotesScreen },
	Note: { screen: NoteScreen },
	Folder: { screen: FolderScreen },
	Folders: { screen: FoldersScreen },
	Login: { screen: LoginScreen },
	Loading: { screen: LoadingScreen },
});

class AppComponent extends React.Component {

	componentDidMount() {
		let db = new Database();
		//db.setDebugEnabled(Registry.debugMode());
		db.setDebugEnabled(false);

		BaseModel.dispatch = this.props.dispatch;
		BaseModel.db_ = db;
		NoteFolderService.dispatch = this.props.dispatch;

		db.open().then(() => {
			Log.info('Database is ready.');
			Registry.setDb(db);
		}).then(() => {
			Log.info('Loading settings...');
			return Setting.load();
		}).then(() => {
			let user = Setting.object('user');
			Log.info('Client ID', Setting.value('clientId'));
			Log.info('User', user);

			Registry.api().setSession(user.session);

			this.props.dispatch({
				type: 'USER_SET',
				user: user,
			});

			Log.info('Loading folders...');

			return Folder.all().then((folders) => {
				this.props.dispatch({
					type: 'FOLDERS_UPDATE_ALL',
					folders: folders,
				});
				return folders;
			}).catch((error) => {
				Log.warn('Cannot load folders', error);
			});
		}).then((folders) => {
			let folder = folders[0];

			if (!folder) throw new Error('No default folder is defined');

			return NoteFolderService.openNoteList(folder.id);

			// this.props.dispatch({
			// 	type: 'Navigation/NAVIGATE',
			// 	routeName: 'Notes',
			// 	folderId: folder.id,
			// });
		}).then(() => {
			let synchronizer = new Synchronizer(db, Registry.api());
			Registry.setSynchronizer(synchronizer);
			synchronizer.start();
		}).catch((error) => {
			Log.error('Initialization error:', error);
		});
	}

	sideMenu_change = (isOpen) => {
		// Make sure showSideMenu property of state is updated
		// when the menu is open/closed.
		this.props.dispatch({
			type: isOpen ? 'SIDE_MENU_OPEN' : 'SIDE_MENU_CLOSE',
		});
	}

	render() {
		const sideMenuContent = <SideMenuContent/>;

		return (
			<SideMenu menu={sideMenuContent} onChange={this.sideMenu_change}>
				<MenuContext style={{ flex: 1 }}>
					<AppNavigator navigation={addNavigationHelpers({
						dispatch: this.props.dispatch,
						state: this.props.nav,
					})} />
				</MenuContext>
			</SideMenu>
		);
	}
}

defaultState.nav = AppNavigator.router.getStateForAction({
	type: 'Navigation/NAVIGATE',
	routeName: 'Loading',
	params: {}
});

const mapStateToProps = (state) => {
	return {
  		nav: state.nav
  	};
};

const App = connect(mapStateToProps)(AppComponent);

class Root extends React.Component {
	render() {
		return (
			<Provider store={store}>
				<App />
			</Provider>
		);
	}
}

export { Root };