import { Note } from 'lib/models/note.js';

const defaultState = {
	notes: [],
	notesSource: '',
	notesParentType: null,
	folders: [],
	tags: [],
	searches: [],
	selectedNoteId: null,
	selectedFolderId: null,
	selectedTagId: null,
	selectedSearchId: null,
	selectedItemType: 'note',
	showSideMenu: false,
	screens: {},
	historyCanGoBack: false,
	notesOrder: [
		{ by: 'user_updated_time', dir: 'DESC' },
	],
	syncStarted: false,
	syncReport: {},
	searchQuery: '',
	settings: {},
	appState: 'starting',
	route: {
		type: 'NAV_GO',
		routeName: 'Welcome',
		params: {},
	},
};

let navHistory = [];

function historyCanGoBackTo(route) {
	if (route.routeName == 'Note') return false;
	if (route.routeName == 'Folder') return false;

	return true;
}

function updateOneTagOrFolder(state, action) {
	let newItems = action.type === 'TAGS_UPDATE_ONE' ? state.tags.splice(0) : state.folders.splice(0);
	let item = action.type === 'TAGS_UPDATE_ONE' ? action.tag : action.folder;

	var found = false;
	for (let i = 0; i < newItems.length; i++) {
		let n = newItems[i];
		if (n.id == item.id) {
			newItems[i] = Object.assign(newItems[i], item);
			found = true;
			break;
		}
	}

	if (!found) newItems.push(item);

	let newState = Object.assign({}, state);

	if (action.type === 'TAGS_UPDATE_ONE') {
		newState.tags = newItems;
	} else {
		newState.folders = newItems;
	}

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

			case 'NOTES_SELECT':

				newState = Object.assign({}, state);
				newState.selectedNoteId = action.noteId;
				break;

			case 'FOLDERS_SELECT':

				newState = Object.assign({}, state);
				newState.selectedFolderId = action.folderId;
				newState.notesParentType = 'Folder';
				break;

			case 'SETTINGS_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.settings = action.settings;
				break;

			case 'SETTINGS_UPDATE_ONE':

				newState = Object.assign({}, state);
				let newSettings = Object.assign({}, state.settings);
				newSettings[action.key] = action.value;
				newState.settings = newSettings;
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

				let noteFolderHasChanged = false;
				let newNotes = state.notes.slice();
				var found = false;
				for (let i = 0; i < newNotes.length; i++) {
					let n = newNotes[i];
					if (n.id == modNote.id) {

						// Note is still in the same folder
						if (!('parent_id' in modNote) || modNote.parent_id == n.parent_id) {
							// Merge the properties that have changed (in modNote) into
							// the object we already have.
							newNotes[i] = Object.assign({}, newNotes[i]);

							for (let n in modNote) {
								if (!modNote.hasOwnProperty(n)) continue;
								newNotes[i][n] = modNote[n];
							}

						} else { // Note has moved to a different folder
							newNotes.splice(i, 1);
							noteFolderHasChanged = true;
						}
						found = true;
						break;
					}
				}

				if (!found && ('parent_id' in modNote) && modNote.parent_id == state.selectedFolderId) newNotes.push(modNote);

				newNotes = Note.sortNotes(newNotes, state.notesOrder, newState.settings.uncompletedTodosOnTop);
				newState = Object.assign({}, state);
				newState.notes = newNotes;

				if (noteFolderHasChanged) {
					newState.selectedNoteId = newNotes.length ? newNotes[0].id : null;
				}
				break;

			case 'NOTES_DELETE':

				var previousIndex = 0;
				var newNotes = [];
				for (let i = 0; i < state.notes.length; i++) {
					let f = state.notes[i];
					if (f.id == action.noteId) {
						previousIndex = i;
						continue;
					}
					newNotes.push(f);
				}

				newState = Object.assign({}, state);
				newState.notes = newNotes;

				if (previousIndex >= newNotes.length) {
					previousIndex = newNotes.length - 1;
				}

				newState.selectedNoteId = previousIndex >= 0 ? newNotes[previousIndex].id : null;
				break;

			case 'FOLDERS_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.folders = action.folders;
				break;

			case 'TAGS_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.tags = action.tags;
				break;				

			case 'TAGS_SELECT':

				newState = Object.assign({}, state);
				newState.selectedTagId = action.tagId;
				newState.notesParentType = 'Tag';
				break;

			case 'TAGS_UPDATE_ONE':

				newState = updateOneTagOrFolder(state, action);

				// var newTags = state.tags.splice(0);
				// var found = false;
				// for (let i = 0; i < newTags.length; i++) {
				// 	let n = newTags[i];
				// 	if (n.id == action.tag.id) {
				// 		newTags[i] = Object.assign(newTags[i], action.tag);
				// 		found = true;
				// 		break;
				// 	}
				// }

				// if (!found) newTags.push(action.tag);

				// newState = Object.assign({}, state);
				// newState.tags = newTags;
				break;

			case 'FOLDERS_UPDATE_ONE':

				newState = updateOneTagOrFolder(state, action);
				// var newFolders = state.folders.splice(0);
				// var found = false;
				// for (let i = 0; i < newFolders.length; i++) {
				// 	let n = newFolders[i];
				// 	if (n.id == action.folder.id) {
				// 		newFolders[i] = Object.assign(newFolders[i], action.folder);
				// 		found = true;
				// 		break;
				// 	}
				// }

				// if (!found) newFolders.push(action.folder);

				// newState = Object.assign({}, state);
				// newState.folders = newFolders;
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
				break;

			case 'SEARCH_ADD':

				newState = Object.assign({}, state);
				let searches = newState.searches.slice();
				searches.push(action.search);
				newState.searches = searches;
				break;

			case 'SEARCH_REMOVE':
				
				let foundIndex = -1;
				for (let i = 0; i < state.searches.length; i++) {
					if (state.searches[i].id === action.searchId) {
						foundIndex = i;
						break;
					}
				}

				if (foundIndex >= 0) {
					newState = Object.assign({}, state);
					let newSearches = newState.searches.slice();
					newSearches.splice(foundIndex, 1);
					newState.searches = newSearches;
				}
				break;			

			case 'SEARCH_SELECT':

				newState = Object.assign({}, state);
				newState.selectedSearchId = action.searchId;
				newState.notesParentType = 'Search';
				break;

			case 'SET_APP_STATE':

				newState = Object.assign({}, state);
				newState.appState = action.state;
				break;

		}
	} catch (error) {
		error.message = 'In reducer: ' + error.message + ' Action: ' + JSON.stringify(action);
		throw error;
	}

	return newState;
}

export { reducer, defaultState };