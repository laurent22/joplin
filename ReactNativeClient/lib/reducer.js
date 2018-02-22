const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const ArrayUtils = require('lib/ArrayUtils.js');

const defaultState = {
	notes: [],
	notesSource: '',
	notesParentType: null,
	folders: [],
	tags: [],
	masterKeys: [],
	notLoadedMasterKeys: [],
	searches: [],
	selectedNoteIds: [],
	selectedFolderId: null,
	selectedTagId: null,
	selectedSearchId: null,
	selectedItemType: 'note',
	showSideMenu: false,
	screens: {},
	historyCanGoBack: false,
	syncStarted: false,
	syncReport: {},
	searchQuery: '',
	settings: {},
	appState: 'starting',
	hasDisabledSyncItems: false,
	newNote: null,
};

const stateUtils = {};

stateUtils.notesOrder = function(stateSettings) {
	return [{
		by: stateSettings['notes.sortOrder.field'],
		dir: stateSettings['notes.sortOrder.reverse'] ? 'DESC' : 'ASC',
	}];
}

function arrayHasEncryptedItems(array) {
	for (let i = 0; i < array.length; i++) {
		if (!!array[i].encryption_applied) return true;
	}
	return false
}

function stateHasEncryptedItems(state) {
	if (arrayHasEncryptedItems(state.notes)) return true;
	if (arrayHasEncryptedItems(state.folders)) return true;
	if (arrayHasEncryptedItems(state.tags)) return true;
	return false;
}

// When deleting a note, tag or folder
function handleItemDelete(state, action) {
	let newState = Object.assign({}, state);

	const map = {
		'FOLDER_DELETE': ['folders', 'selectedFolderId'],
		'NOTE_DELETE': ['notes', 'selectedNoteIds'],
		'TAG_DELETE': ['tags', 'selectedTagId'],
		'SEARCH_DELETE': ['searches', 'selectedSearchId'],
	};

	const listKey = map[action.type][0];
	const selectedItemKey = map[action.type][1];

	let previousIndex = 0;
	let newItems = [];
	const items = state[listKey];
	for (let i = 0; i < items.length; i++) {
		let item = items[i];
		if (item.id == action.id) {
			previousIndex = i;
			continue;
		}
		newItems.push(item);
	}

	newState = Object.assign({}, state);
	newState[listKey] = newItems;

	if (previousIndex >= newItems.length) {
		previousIndex = newItems.length - 1;
	}

	const newId = previousIndex >= 0 ? newItems[previousIndex].id : null;
	newState[selectedItemKey] = action.type === 'NOTE_DELETE' ? [newId] : newId;

	if (!newId && newState.notesParentType !== 'Folder') {
		newState.notesParentType = 'Folder';
	}

	return newState;
}

function updateOneItem(state, action) {
	let itemsKey = null;
	if (action.type === 'TAG_UPDATE_ONE') itemsKey = 'tags';
	if (action.type === 'FOLDER_UPDATE_ONE') itemsKey = 'folders';
	if (action.type === 'MASTERKEY_UPDATE_ONE') itemsKey = 'masterKeys';

	let newItems = state[itemsKey].splice(0);
	let item = action.item;

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

	newState[itemsKey] = newItems;

	return newState;
}

function defaultNotesParentType(state, exclusion) {
	let newNotesParentType = null;

	if (exclusion !== 'Folder' && state.selectedFolderId) {
		newNotesParentType = 'Folder';
	} else if (exclusion !== 'Tag' && state.selectedTagId) {
		newNotesParentType = 'Tag';
	} else if (exclusion !== 'Search' && state.selectedSearchId) {
		newNotesParentType = 'Search';
	}

	return newNotesParentType;
}

function changeSelectedNotes(state, action) {
	const noteIds = 'id' in action ? (action.id ? [action.id] : []) : action.ids;
	let newState = Object.assign({}, state);

	if (action.type === 'NOTE_SELECT') {
		newState.selectedNoteIds = noteIds;
		newState.newNote = null;
		return newState;
	}

	if (action.type === 'NOTE_SELECT_ADD') {
		if (!noteIds.length) return state;
		newState.selectedNoteIds = ArrayUtils.unique(newState.selectedNoteIds.concat(noteIds));
		newState.newNote = null;
		return newState;
	}

	if (action.type === 'NOTE_SELECT_REMOVE') {
		if (!noteIds.length) return state; // Nothing to unselect
		if (state.selectedNoteIds.length <= 1) return state; // Cannot unselect the last note

		let newSelectedNoteIds = [];
		for (let i = 0; i < newState.selectedNoteIds.length; i++) {
			const id = newState.selectedNoteIds[i];
			if (noteIds.indexOf(id) >= 0) continue;
			newSelectedNoteIds.push(id);
		}
		newState.selectedNoteIds = newSelectedNoteIds;
		newState.newNote = null;

		return newState;
	}

	if (action.type === 'NOTE_SELECT_TOGGLE') {
		if (!noteIds.length) return state;

		if (newState.selectedNoteIds.indexOf(noteIds[0]) >= 0) {
			newState = changeSelectedNotes(state, { type: 'NOTE_SELECT_REMOVE', id: noteIds[0] });
		} else {
			newState = changeSelectedNotes(state, { type: 'NOTE_SELECT_ADD', id: noteIds[0] });
		}

		newState.newNote = null;

		return newState;
	}

	throw new Error('Unreachable');
}

const reducer = (state = defaultState, action) => {
	let newState = state;

	try {
		switch (action.type) {

			case 'NOTE_SELECT':
			case 'NOTE_SELECT_ADD':
			case 'NOTE_SELECT_REMOVE':
			case 'NOTE_SELECT_TOGGLE':

				newState = changeSelectedNotes(state, action);
				break;

			case 'NOTE_SELECT_EXTEND':

				newState = Object.assign({}, state);

				if (!newState.selectedNoteIds.length) {
					newState.selectedNoteIds = [action.id];
				} else {
					const selectRangeId1 = state.selectedNoteIds[state.selectedNoteIds.length - 1];
					const selectRangeId2 = action.id;
					if (selectRangeId1 === selectRangeId2) return state;

					let newSelectedNoteIds = state.selectedNoteIds.slice();
					let selectionStarted = false;
					for (let i = 0; i < state.notes.length; i++) {
						const id = state.notes[i].id;

						if (!selectionStarted && (id === selectRangeId1 || id === selectRangeId2)) {
							selectionStarted = true;
							if (newSelectedNoteIds.indexOf(id) < 0) newSelectedNoteIds.push(id);
							continue;
						} else if (selectionStarted && (id === selectRangeId1 || id === selectRangeId2)) {
							if (newSelectedNoteIds.indexOf(id) < 0) newSelectedNoteIds.push(id);
							break;
						}

						if (selectionStarted && newSelectedNoteIds.indexOf(id) < 0) {
							newSelectedNoteIds.push(id);
						}
					}
					newState.selectedNoteIds = newSelectedNoteIds;
				}
				break;

			case 'FOLDER_SELECT':

				newState = Object.assign({}, state);
				newState.selectedFolderId = action.id;
				if (!action.id) {
					newState.notesParentType = defaultNotesParentType(state, 'Folder');
				} else {
					newState.notesParentType = 'Folder';
				}
				break;

			case 'SETTING_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.settings = action.settings;
				break;

			case 'SETTING_UPDATE_ONE':

				newState = Object.assign({}, state);
				let newSettings = Object.assign({}, state.settings);
				newSettings[action.key] = action.value;
				newState.settings = newSettings;
				break;

			// Replace all the notes with the provided array
			case 'NOTE_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.notes = action.notes;
				newState.notesSource = action.notesSource;
				break;

			// Insert the note into the note list if it's new, or
			// update it within the note array if it already exists.
			case 'NOTE_UPDATE_ONE':

				const modNote = action.note;

				const noteIsInFolder = function(note, folderId) {
					if (note.is_conflict) return folderId === Folder.conflictFolderId();
					if (!('parent_id' in modNote) || note.parent_id == folderId) return true;
					return false;
				}

				let noteFolderHasChanged = false;
				let newNotes = state.notes.slice();
				var found = false;
				for (let i = 0; i < newNotes.length; i++) {
					let n = newNotes[i];
					if (n.id == modNote.id) {

						// Note is still in the same folder
						if (noteIsInFolder(modNote, n.parent_id)) {
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

				// Note was not found - if the current folder is the same as the note folder,
				// add it to it.
				if (!found) {
					if (noteIsInFolder(modNote, state.selectedFolderId)) {
						newNotes.push(modNote);
					}
				}

				//newNotes = Note.sortNotes(newNotes, state.notesOrder, newState.settings.uncompletedTodosOnTop);
				newNotes = Note.sortNotes(newNotes, stateUtils.notesOrder(state.settings), newState.settings.uncompletedTodosOnTop);
				newState = Object.assign({}, state);
				newState.notes = newNotes;

				if (noteFolderHasChanged) {
					newState.selectedNoteIds = newNotes.length ? [newNotes[0].id] : [];
				}
				break;

			case 'NOTE_DELETE':

				newState = handleItemDelete(state, action);
				break;

			case 'TAG_DELETE':

				newState = handleItemDelete(state, action);
				break;

			case 'FOLDER_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.folders = action.items;
				break;

			case 'TAG_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.tags = action.items;
				break;

			case 'TAG_SELECT':

				newState = Object.assign({}, state);
				newState.selectedTagId = action.id;
				if (!action.id) {
					newState.notesParentType = defaultNotesParentType(state, 'Tag');
				} else {
					newState.notesParentType = 'Tag';
				}
				break;

			case 'TAG_UPDATE_ONE':
			case 'FOLDER_UPDATE_ONE':
			case 'MASTERKEY_UPDATE_ONE':

				newState = updateOneItem(state, action);
				break;

			case 'FOLDER_DELETE':

				newState = handleItemDelete(state, action);
				break;

			case 'MASTERKEY_UPDATE_ALL':

				newState = Object.assign({}, state);
				newState.masterKeys = action.items;
				break;

			case 'MASTERKEY_ADD_NOT_LOADED':

				if (state.notLoadedMasterKeys.indexOf(action.id) < 0) {
					newState = Object.assign({}, state);
					const keys = newState.notLoadedMasterKeys.slice();
					keys.push(action.id);
					newState.notLoadedMasterKeys = keys;
				}
				break;

			case 'MASTERKEY_REMOVE_NOT_LOADED':

				const ids = action.id ? [action.id] : action.ids;
				for (let i = 0; i < ids.length; i++) {
					const id = ids[i];
					const index = state.notLoadedMasterKeys.indexOf(id);
					if (index >= 0) {
						newState = Object.assign({}, state);
						const keys = newState.notLoadedMasterKeys.slice();
						keys.splice(index, 1);
						newState.notLoadedMasterKeys = keys;
					}
				}
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

			case 'SEARCH_DELETE':

				newState = handleItemDelete(state, action);
				break;			

			case 'SEARCH_SELECT':

				newState = Object.assign({}, state);
				newState.selectedSearchId = action.id;
				if (!action.id) {
					newState.notesParentType = defaultNotesParentType(state, 'Search');
				} else {
					newState.notesParentType = 'Search';
				}
				break;

			case 'APP_STATE_SET':

				newState = Object.assign({}, state);
				newState.appState = action.state;
				break;

			case 'SYNC_HAS_DISABLED_SYNC_ITEMS':

				newState = Object.assign({}, state);
				newState.hasDisabledSyncItems = true;
				break;

			case 'NOTE_SET_NEW_ONE':

				newState = Object.assign({}, state);
				newState.newNote = action.item;
				break;				

		}
	} catch (error) {
		error.message = 'In reducer: ' + error.message + ' Action: ' + JSON.stringify(action);
		throw error;
	}

	if (action.type.indexOf('NOTE_UPDATE') === 0 || action.type.indexOf('FOLDER_UPDATE') === 0 || action.type.indexOf('TAG_UPDATE') === 0) {
		newState = Object.assign({}, newState);
		newState.hasEncryptedItems = stateHasEncryptedItems(newState);
	}

	return newState;
}

module.exports = { reducer, defaultState, stateUtils };