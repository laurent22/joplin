import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Provider } from 'react-redux'
import { createStore } from 'redux';
import { combineReducers } from 'redux';
import { StackNavigator } from 'react-navigation';
import { addNavigationHelpers } from 'react-navigation';
import { Log } from 'lib/log.js'
import { Note } from 'lib/models/note.js'
import { Folder } from 'lib/models/folder.js'
import { BaseModel } from 'lib/base-model.js'
import { Database } from 'lib/database.js'
import { ItemList } from 'lib/components/item-list.js'
import { NotesScreen } from 'lib/components/screens/notes.js'
import { NoteScreen } from 'lib/components/screens/note.js'
import { FolderScreen } from 'lib/components/screens/folder.js'
import { FoldersScreen } from 'lib/components/screens/folders.js'
import { LoginScreen } from 'lib/components/screens/login.js'
import { LoadingScreen } from 'lib/components/screens/loading.js'
import { Setting } from 'lib/models/setting.js'
import { Synchronizer } from 'lib/synchronizer.js'
import { MenuContext } from 'react-native-popup-menu';
import { SideMenu } from 'lib/components/side-menu.js';
import { SideMenuContent } from 'lib/components/side-menu-content.js';
import { NoteFolderService } from 'lib/services/note-folder-service.js';
import { DatabaseDriverReactNative } from 'lib/database-driver-react-native';

let defaultState = {
	notes: [],
	folders: [],
	selectedNoteId: null,
	selectedItemType: 'note',
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

			if ('itemType' in action) {
				newState.selectedItemType = action.itemType;
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
		let db = new Database(new DatabaseDriverReactNative());
		db.setDebugMode(false);

		BaseModel.dispatch = this.props.dispatch;
		BaseModel.db_ = db;
		NoteFolderService.dispatch = this.props.dispatch;

		db.open({ name: '/storage/emulated/0/Download/joplin-42.sqlite' }).then(() => {
			Log.info('Database is ready.');
		}).then(() => {
			Log.info('Loading settings...');
			return Setting.load();
		}).then(() => {
			let user = Setting.object('user');

			if (!user || !user.session) {
				user = {
					email: 'laurent@cozic.net',
					session: "02d0e9ca42cbbc2d35efb1bc790b9eec",
				}
				Setting.setObject('user', user);
				this.props.dispatch({
					type: 'USER_SET',
					user: user,
				});
			}

			Setting.setValue('sync.lastRevId', '123456');

			Log.info('Client ID', Setting.value('clientId'));
			Log.info('User', user);

			// this.props.dispatch({
			// 	type: 'USER_SET',
			// 	user: user,
			// });

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

			var Dropbox = require('dropbox');
			var dropboxApi = new Dropbox({ accessToken: '' });
			// dbx.filesListFolder({path: '/Joplin/Laurent.4e847cc'})
			// .then(function(response) {
			// //console.log('DROPBOX RESPONSE', response);
			// console.log('DROPBOX RESPONSE', response.entries.length, response.has_more);
			// })
			// .catch(function(error) {
			// console.log('DROPBOX ERROR', error);
			// });

			// return this.api_;


		}).catch((error) => {
			Log.error('Initialization error:', error);
		});
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

		return (
			<SideMenu menu={sideMenuContent} onChange={(isOpen) => this.sideMenu_change(isOpen)}>
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