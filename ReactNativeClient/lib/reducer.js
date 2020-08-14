const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const ArrayUtils = require('lib/ArrayUtils.js');
const { ALL_NOTES_FILTER_ID } = require('lib/reserved-ids');

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
	selectedNoteHash: '',
	selectedFolderId: null,
	selectedTagId: null,
	selectedSearchId: null,
	selectedItemType: 'note',
	lastSelectedNotesIds: {
		Folder: {},
		Tag: {},
		Search: {},
	},
	showSideMenu: false,
	screens: {},
	historyCanGoBack: false,
	syncStarted: false,
	syncReport: {},
	searchQuery: '',
	settings: {},
	sharedData: null,
	appState: 'starting',
	hasDisabledSyncItems: false,
	hasDisabledEncryptionItems: false,
	customCss: '',
	templates: [],
	collapsedFolderIds: [],
	clipperServer: {
		startState: 'idle',
		port: null,
	},
	decryptionWorker: {
		state: 'idle',
		itemIndex: 0,
		itemCount: 0,
		decryptedItemCounts: {},
		decryptedItemCount: 0,
		skippedItemCount: 0,
	},
	selectedNoteTags: [],
	resourceFetcher: {
		toFetchCount: 0,
	},
	backwardHistoryNotes: [],
	forwardHistoryNotes: [],
	plugins: {},
	provisionalNoteIds: [],
	editorNoteStatuses: {},
	isInsertingNotes: false,
};

const MAX_HISTORY = 200;

const stateUtils = {};

const derivedStateCache_ = {};

// Allows, for a given state, to return the same derived
// objects, to prevent unecessary updates on calling components.
const cacheEnabledOutput = (key, output) => {
	key = `${key}_${JSON.stringify(output)}`;
	if (derivedStateCache_[key]) return derivedStateCache_[key];

	derivedStateCache_[key] = output;
	return derivedStateCache_[key];
};

stateUtils.hasOneSelectedNote = function(state) {
	return state.selectedNoteIds.length === 1;
};

stateUtils.notesOrder = function(stateSettings) {
	if (stateSettings['notes.sortOrder.field'] === 'order') {
		return cacheEnabledOutput('notesOrder', [
			{
				by: 'order',
				dir: 'DESC',
			},
			{
				by: 'user_created_time',
				dir: 'DESC',
			},
		]);
	} else {
		return cacheEnabledOutput('notesOrder', [
			{
				by: stateSettings['notes.sortOrder.field'],
				dir: stateSettings['notes.sortOrder.reverse'] ? 'DESC' : 'ASC',
			},
		]);
	}
};

stateUtils.foldersOrder = function(stateSettings) {
	return cacheEnabledOutput('foldersOrder', [
		{
			by: stateSettings['folders.sortOrder.field'],
			dir: stateSettings['folders.sortOrder.reverse'] ? 'DESC' : 'ASC',
		},
	]);
};

stateUtils.hasNotesBeingSaved = function(state) {
	for (const id in state.editorNoteStatuses) {
		if (state.editorNoteStatuses[id] === 'saving') return true;
	}
	return false;
};

stateUtils.parentItem = function(state) {
	const t = state.notesParentType;
	let id = null;
	if (t === 'Folder') id = state.selectedFolderId;
	if (t === 'Tag') id = state.selectedTagId;
	if (t === 'Search') id = state.selectedSearchId;
	if (!t || !id) return null;
	return { type: t, id: id };
};

stateUtils.lastSelectedNoteIds = function(state) {
	const parent = stateUtils.parentItem(state);
	if (!parent) return [];
	const output = state.lastSelectedNotesIds[parent.type][parent.id];
	return output ? output : [];
};

stateUtils.getCurrentNote = function(state) {
	const selectedNoteIds = state.selectedNoteIds;
	const notes = state.notes;
	if (selectedNoteIds != null && selectedNoteIds.length > 0) {
		const currNote = notes.find(note => note.id === selectedNoteIds[0]);
		if (currNote != null) {
			return {
				id: currNote.id,
				parent_id: currNote.parent_id,
				notesParentType: state.notesParentType,
				selectedFolderId: state.selectedFolderId,
				selectedTagId: state.selectedTagId,
				selectedSearchId: state.selectedSearchId,
				searches: state.searches,
				selectedSmartFilterId: state.selectedSmartFilterId,
			};
		}
	}
	return null;
};

function arrayHasEncryptedItems(array) {
	for (let i = 0; i < array.length; i++) {
		if (array[i].encryption_applied) return true;
	}
	return false;
}

function stateHasEncryptedItems(state) {
	if (arrayHasEncryptedItems(state.notes)) return true;
	if (arrayHasEncryptedItems(state.folders)) return true;
	if (arrayHasEncryptedItems(state.tags)) return true;
	return false;
}

function folderSetCollapsed(state, action) {
	const collapsedFolderIds = state.collapsedFolderIds.slice();
	const idx = collapsedFolderIds.indexOf(action.id);

	if (action.collapsed) {
		if (idx >= 0) return state;
		collapsedFolderIds.push(action.id);
	} else {
		if (idx < 0) return state;
		collapsedFolderIds.splice(idx, 1);
	}

	const newState = Object.assign({}, state);
	newState.collapsedFolderIds = collapsedFolderIds;
	return newState;
}

function removeAdjacentDuplicates(items) {
	return items.filter((item, idx) => (idx >= 1) ? items[idx - 1].id !== item.id : true);
}

// When deleting a note, tag or folder
function handleItemDelete(state, action) {
	const map = {
		FOLDER_DELETE: ['folders', 'selectedFolderId', true],
		NOTE_DELETE: ['notes', 'selectedNoteIds', false],
		TAG_DELETE: ['tags', 'selectedTagId', true],
		SEARCH_DELETE: ['searches', 'selectedSearchId', true],
	};

	const listKey = map[action.type][0];
	const selectedItemKey = map[action.type][1];
	const isSingular = map[action.type][2];

	const selectedItemKeys = isSingular ? [state[selectedItemKey]] : state[selectedItemKey];
	const isSelected = selectedItemKeys.includes(action.id);

	const items = state[listKey];
	const newItems = [];
	let newSelectedIndexes = [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (isSelected) {
			// the selected item is deleted so select the following item
			// if multiple items are selected then just use the first one
			if (selectedItemKeys[0] == item.id) {
				newSelectedIndexes.push(newItems.length);
			}
		} else {
			// the selected item/s is not deleted so keep it selected
			if (selectedItemKeys.includes(item.id)) {
				newSelectedIndexes.push(newItems.length);
			}
		}
		if (item.id == action.id) {
			continue;
		}
		newItems.push(item);
	}

	if (newItems.length == 0) {
		newSelectedIndexes = []; // no remaining items so no selection

	}  else if (newSelectedIndexes.length == 0) {
		newSelectedIndexes.push(0); // no selection exists so select the top

	} else {
		// when the items at end of list are deleted then select the end
		for (let i = 0; i < newSelectedIndexes.length; i++) {
			if (newSelectedIndexes[i] >= newItems.length) {
				newSelectedIndexes = [newItems.length - 1];
				break;
			}
		}
	}

	const newState = Object.assign({}, state);
	newState[listKey] = newItems;

	const newIds = [];
	for (let i = 0; i < newSelectedIndexes.length; i++) {
		newIds.push(newItems[newSelectedIndexes[i]].id);
	}
	newState[selectedItemKey] = isSingular ? newIds[0] : newIds;

	if ((newIds.length == 0) && newState.notesParentType !== 'Folder') {
		newState.notesParentType = 'Folder';
	}

	return newState;
}

function updateOneItem(state, action, keyName = '') {
	let itemsKey = null;
	if (keyName) { itemsKey = keyName; } else {
		if (action.type === 'TAG_UPDATE_ONE') itemsKey = 'tags';
		if (action.type === 'FOLDER_UPDATE_ONE') itemsKey = 'folders';
		if (action.type === 'MASTERKEY_UPDATE_ONE') itemsKey = 'masterKeys';
	}

	const newItems = state[itemsKey].splice(0);
	const item = action.item;

	let found = false;
	for (let i = 0; i < newItems.length; i++) {
		const n = newItems[i];
		if (n.id == item.id) {
			newItems[i] = Object.assign(newItems[i], item);
			found = true;
			break;
		}
	}

	if (!found) newItems.push(item);

	const newState = Object.assign({}, state);

	newState[itemsKey] = newItems;

	return newState;
}

function updateSelectedNotesFromExistingNotes(state) {
	const newSelectedNoteIds = [];
	for (const selectedNoteId of state.selectedNoteIds) {
		for (const n of state.notes) {
			if (n.id === selectedNoteId) {
				newSelectedNoteIds.push(n.id);
			}
		}
	}

	return Object.assign({}, state, {
		selectedNoteIds: newSelectedNoteIds,
	});
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

function changeSelectedFolder(state, action, options = null) {
	if (!options) options = {};
	const newState = Object.assign({}, state);
	newState.selectedFolderId = 'folderId' in action ? action.folderId : action.id;
	if (!newState.selectedFolderId) {
		newState.notesParentType = defaultNotesParentType(state, 'Folder');
	} else {
		newState.notesParentType = 'Folder';
	}

	if (newState.selectedFolderId === state.selectedFolderId && newState.notesParentType === state.notesParentType) return state;

	if (options.clearSelectedNoteIds) newState.selectedNoteIds = [];

	return newState;
}

function recordLastSelectedNoteIds(state, noteIds) {
	const newOnes = Object.assign({}, state.lastSelectedNotesIds);
	const parent = stateUtils.parentItem(state);
	if (!parent) return state;

	newOnes[parent.type][parent.id] = noteIds.slice();

	return Object.assign({}, state, {
		lastSelectedNotesIds: newOnes,
	});
}

function changeSelectedNotes(state, action, options = null) {
	if (!options) options = {};

	let noteIds = [];
	if (action.id) noteIds = [action.id];
	if (action.ids) noteIds = action.ids;
	if (action.noteId) noteIds = [action.noteId];

	let newState = Object.assign({}, state);

	if (action.type === 'NOTE_SELECT') {
		if (JSON.stringify(newState.selectedNoteIds) === JSON.stringify(noteIds)) return state;
		newState.selectedNoteIds = noteIds;
		newState.selectedNoteHash = action.hash ? action.hash : '';
	} else if (action.type === 'NOTE_SELECT_ADD') {
		if (!noteIds.length) return state;
		newState.selectedNoteIds = ArrayUtils.unique(newState.selectedNoteIds.concat(noteIds));
	} else if (action.type === 'NOTE_SELECT_REMOVE') {
		if (!noteIds.length) return state; // Nothing to unselect
		if (state.selectedNoteIds.length <= 1) return state; // Cannot unselect the last note

		const newSelectedNoteIds = [];
		for (let i = 0; i < newState.selectedNoteIds.length; i++) {
			const id = newState.selectedNoteIds[i];
			if (noteIds.indexOf(id) >= 0) continue;
			newSelectedNoteIds.push(id);
		}
		newState.selectedNoteIds = newSelectedNoteIds;
	} else if (action.type === 'NOTE_SELECT_TOGGLE') {
		if (!noteIds.length) return state;

		if (newState.selectedNoteIds.indexOf(noteIds[0]) >= 0) {
			newState = changeSelectedNotes(state, { type: 'NOTE_SELECT_REMOVE', id: noteIds[0] });
		} else {
			newState = changeSelectedNotes(state, { type: 'NOTE_SELECT_ADD', id: noteIds[0] });
		}
	} else {
		throw new Error('Unreachable');
	}

	newState = recordLastSelectedNoteIds(newState, newState.selectedNoteIds);

	return newState;
}

function removeItemFromArray(array, property, value) {
	for (let i = 0; i !== array.length; ++i) {
		const currentItem = array[i];
		if (currentItem[property] === value) {
			array.splice(i, 1);
			break;
		}
	}
	return array;
}

const getContextFromHistory = (ctx) => {
	const result = {};
	result.notesParentType = ctx.notesParentType;
	if (result.notesParentType === 'Folder') {
		result.selectedFolderId = ctx.selectedFolderId;
	} else if (result.notesParentType === 'Tag') {
		result.selectedTagId = ctx.selectedTagId;
	} else if (result.notesParentType === 'Search') {
		result.selectedSearchId = ctx.selectedSearchId;
		result.searches = ctx.searches;
	} else if (result.notesParentType === 'SmartFilter') {
		result.selectedSmartFilterId = ctx.selectedSmartFilterId;
	}
	return result;
};

function handleHistory(state, action) {
	let newState = Object.assign({}, state);
	let backwardHistoryNotes = newState.backwardHistoryNotes.slice();
	let forwardHistoryNotes = newState.forwardHistoryNotes.slice();
	const currentNote = stateUtils.getCurrentNote(state);
	switch (action.type) {
	case 'HISTORY_BACKWARD': {
		const note = backwardHistoryNotes[backwardHistoryNotes.length - 1];
		if (currentNote != null && (forwardHistoryNotes.length === 0 || currentNote.id != forwardHistoryNotes[forwardHistoryNotes.length - 1].id)) {
			forwardHistoryNotes = forwardHistoryNotes.concat(currentNote).slice(-MAX_HISTORY);
		}

		newState = changeSelectedFolder(newState, Object.assign({}, action, { type: 'FOLDER_SELECT', folderId: note.parent_id }));
		newState = changeSelectedNotes(newState, Object.assign({}, action, { type: 'NOTE_SELECT', noteId: note.id }));

		const ctx = backwardHistoryNotes[backwardHistoryNotes.length - 1];
		newState = Object.assign(newState, getContextFromHistory(ctx));

		backwardHistoryNotes.pop();
		break;
	}
	case 'HISTORY_FORWARD': {
		const note = forwardHistoryNotes[forwardHistoryNotes.length - 1];

		if (currentNote != null && (backwardHistoryNotes.length === 0 || currentNote.id != backwardHistoryNotes[backwardHistoryNotes.length - 1].id)) {
			backwardHistoryNotes = backwardHistoryNotes.concat(currentNote).slice(-MAX_HISTORY);
		}

		newState = changeSelectedFolder(newState, Object.assign({}, action, { type: 'FOLDER_SELECT', folderId: note.parent_id }));
		newState = changeSelectedNotes(newState, Object.assign({}, action, { type: 'NOTE_SELECT', noteId: note.id }));

		const ctx = forwardHistoryNotes[forwardHistoryNotes.length - 1];
		newState = Object.assign(newState, getContextFromHistory(ctx));


		forwardHistoryNotes.pop();
		break;
	}
	case 'NOTE_SELECT':
		if (currentNote != null &&  action.id != currentNote.id) {
			forwardHistoryNotes = [];
			backwardHistoryNotes = backwardHistoryNotes.concat(currentNote).slice(-MAX_HISTORY);
		}
		// History should be free from duplicates.
		if (backwardHistoryNotes != null && backwardHistoryNotes.length > 0 &&
						action.id === backwardHistoryNotes[backwardHistoryNotes.length - 1].id) {
			backwardHistoryNotes.pop();
		}
		break;
	case 'TAG_SELECT':
	case 'FOLDER_AND_NOTE_SELECT':
	case 'FOLDER_SELECT':
		if (currentNote != null) {
			forwardHistoryNotes = [];
			backwardHistoryNotes = backwardHistoryNotes.concat(currentNote).slice(-MAX_HISTORY);
		}
		break;
	case 'NOTE_UPDATE_ONE': {
		const modNote = action.note;

		backwardHistoryNotes = backwardHistoryNotes.map(note => {
			if (note.id === modNote.id) {
				return Object.assign({}, note, { parent_id: modNote.parent_id, selectedFolderId: modNote.parent_id });
			}
			return note;
		});

		forwardHistoryNotes = forwardHistoryNotes.map(note => {
			if (note.id === modNote.id) {
				return Object.assign({}, note, { parent_id: modNote.parent_id, selectedFolderId: modNote.parent_id });
			}
			return note;
		});

		break;
	}
	case 'SEARCH_UPDATE':
		if (currentNote != null && (backwardHistoryNotes.length === 0 ||
						backwardHistoryNotes[backwardHistoryNotes.length - 1].id != currentNote.id)) {
			forwardHistoryNotes = [];
			backwardHistoryNotes = backwardHistoryNotes.concat(currentNote).slice(-MAX_HISTORY);
		}
		break;
	case 'FOLDER_DELETE':
		backwardHistoryNotes = backwardHistoryNotes.filter(note => note.parent_id != action.id);
		forwardHistoryNotes = forwardHistoryNotes.filter(note => note.parent_id != action.id);

		backwardHistoryNotes = removeAdjacentDuplicates(backwardHistoryNotes);
		forwardHistoryNotes = removeAdjacentDuplicates(forwardHistoryNotes);
		break;
	case 'NOTE_DELETE': {
		backwardHistoryNotes = backwardHistoryNotes.filter(note => note.id != action.id);
		forwardHistoryNotes = forwardHistoryNotes.filter(note => note.id != action.id);

		backwardHistoryNotes = removeAdjacentDuplicates(backwardHistoryNotes);
		forwardHistoryNotes = removeAdjacentDuplicates(forwardHistoryNotes);

		// Fix the case where after deletion the currently selected note is also the latest in history
		const selectedNoteIds = newState.selectedNoteIds;
		if (selectedNoteIds.length && backwardHistoryNotes.length && backwardHistoryNotes[backwardHistoryNotes.length - 1].id === selectedNoteIds[0]) {
			backwardHistoryNotes = backwardHistoryNotes.slice(0, backwardHistoryNotes.length - 1);
		}
		if (selectedNoteIds.length && forwardHistoryNotes.length && forwardHistoryNotes[forwardHistoryNotes.length - 1].id === selectedNoteIds[0]) {
			forwardHistoryNotes = forwardHistoryNotes.slice(0, forwardHistoryNotes.length - 1);
		}
		break;
	}
	default:
		// console.log('Unknown action in history reducer.' ,action.type);
		return state;
	}

	newState.backwardHistoryNotes = backwardHistoryNotes;
	newState.forwardHistoryNotes = forwardHistoryNotes;
	return newState;
}

const reducer = (state = defaultState, action) => {
	// if (!['SIDE_MENU_OPEN_PERCENT'].includes(action.type)) console.info('Action', action.type);

	let newState = state;

	// NOTE_DELETE requires post processing
	if (action.type !== 'NOTE_DELETE') {
		newState = handleHistory(newState, action);
	}

	try {
		switch (action.type) {

		case 'NOTE_SELECT':
		case 'NOTE_SELECT_ADD':
		case 'NOTE_SELECT_REMOVE':
		case 'NOTE_SELECT_TOGGLE':
			newState = changeSelectedNotes(newState, action);
			break;
		case 'NOTE_SELECT_EXTEND':
			{
				newState = Object.assign({}, state);

				if (!newState.selectedNoteIds.length) {
					newState.selectedNoteIds = [action.id];
				} else {
					const selectRangeId1 = state.selectedNoteIds[state.selectedNoteIds.length - 1];
					const selectRangeId2 = action.id;
					if (selectRangeId1 === selectRangeId2) return state;

					const newSelectedNoteIds = state.selectedNoteIds.slice();
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
			}
			break;

		case 'NOTE_SELECT_ALL':
			newState = Object.assign({}, state);
			newState.selectedNoteIds = newState.notes.map(n => n.id);
			break;

		case 'NOTE_SELECT_ALL_TOGGLE': {
			newState = Object.assign({}, state);
			const allSelected = state.notes.every(n => state.selectedNoteIds.includes(n.id));
			if (allSelected) {
				newState.selectedNoteIds = [];
			} else {
				newState.selectedNoteIds = newState.notes.map(n => n.id);
			}
			break;
		}

		case 'SMART_FILTER_SELECT':
			newState = Object.assign({}, state);
			newState.notesParentType = 'SmartFilter';
			newState.selectedSmartFilterId = action.id;
			break;

		case 'FOLDER_SELECT':
			newState = changeSelectedFolder(newState, action, { clearSelectedNoteIds: true });
			break;

		case 'FOLDER_AND_NOTE_SELECT':
			{
				newState = changeSelectedFolder(newState, action);
				const noteSelectAction = Object.assign({}, action, { type: 'NOTE_SELECT' });
				newState = changeSelectedNotes(newState, noteSelectAction);
			}
			break;

		case 'SETTING_UPDATE_ALL':
			newState = Object.assign({}, state);
			newState.settings = action.settings;
			break;

		case 'SETTING_UPDATE_ONE':
			{
				newState = Object.assign({}, state);
				const newSettings = Object.assign({}, state.settings);
				newSettings[action.key] = action.value;
				newState.settings = newSettings;
			}
			break;

		case 'NOTE_PROVISIONAL_FLAG_CLEAR':
			{
				const newIds = ArrayUtils.removeElement(state.provisionalNoteIds, action.id);
				if (newIds !== state.provisionalNoteIds) {
					newState = Object.assign({}, state, { provisionalNoteIds: newIds });
				}
			}
			break;

			// Replace all the notes with the provided array
		case 'NOTE_UPDATE_ALL':
			newState = Object.assign({}, state);
			newState.notes = action.notes;
			newState.notesSource = action.notesSource;
			newState = updateSelectedNotesFromExistingNotes(newState);
			break;

			// Insert the note into the note list if it's new, or
			// update it within the note array if it already exists.
		case 'NOTE_UPDATE_ONE':
			{
				const modNote = action.note;
				const isViewingAllNotes = (state.notesParentType === 'SmartFilter' && state.selectedSmartFilterId === ALL_NOTES_FILTER_ID);
				const isViewingConflictFolder = state.notesParentType === 'Folder' && state.selectedFolderId === Folder.conflictFolderId();

				const noteIsInFolder = function(note, folderId) {
					if (note.is_conflict && isViewingConflictFolder) return true;
					if (!('parent_id' in modNote) || note.parent_id == folderId) return true;
					return false;
				};

				let movedNotePreviousIndex = 0;
				let noteFolderHasChanged = false;
				let newNotes = state.notes.slice();
				let found = false;
				for (let i = 0; i < newNotes.length; i++) {
					const n = newNotes[i];
					if (n.id == modNote.id) {
						// Note is still in the same folder
						if (isViewingAllNotes || noteIsInFolder(modNote, n.parent_id)) {
							// Merge the properties that have changed (in modNote) into
							// the object we already have.
							newNotes[i] = Object.assign({}, newNotes[i]);

							for (const n in modNote) {
								if (!modNote.hasOwnProperty(n)) continue;
								newNotes[i][n] = modNote[n];
							}
						} else {
							// Note has moved to a different folder
							newNotes.splice(i, 1);
							noteFolderHasChanged = true;
							movedNotePreviousIndex = i;
						}
						found = true;
						break;
					}
				}

				// Note was not found - if the current folder is the same as the note folder,
				// add it to it.
				if (!found) {
					if (isViewingAllNotes || noteIsInFolder(modNote, state.selectedFolderId)) {
						newNotes.push(modNote);
					}
				}

				// newNotes = Note.sortNotes(newNotes, state.notesOrder, newState.settings.uncompletedTodosOnTop);
				newNotes = Note.sortNotes(newNotes, stateUtils.notesOrder(state.settings), newState.settings.uncompletedTodosOnTop);
				newState = Object.assign({}, state);
				newState.notes = newNotes;

				if (noteFolderHasChanged) {
					let newIndex = movedNotePreviousIndex;
					if (newIndex >= newNotes.length) newIndex = newNotes.length - 1;
					if (!newNotes.length) newIndex = -1;
					newState.selectedNoteIds = newIndex >= 0 ? [newNotes[newIndex].id] : [];
				}

				if (action.provisional) {
					newState.provisionalNoteIds.push(modNote.id);
				} else {
					const idx = newState.provisionalNoteIds.indexOf(modNote.id);
					if (idx >= 0) {
						const t = newState.provisionalNoteIds.slice();
						t.splice(idx, 1);
						newState.provisionalNoteIds = t;
					}
				}
			}
			break;

		case 'NOTE_DELETE':

			{
				newState = handleItemDelete(state, action);

				const idx = newState.provisionalNoteIds.indexOf(action.id);
				if (idx >= 0) {
					const t = newState.provisionalNoteIds.slice();
					t.splice(idx, 1);
					newState.provisionalNoteIds = t;
				}
			}
			break;

		case 'NOTE_IS_INSERTING_NOTES':

			if (state.isInsertingNotes !== action.value) {
				newState = Object.assign({}, state);
				newState.isInsertingNotes = action.value;
			}
			break;

		case 'TAG_DELETE':
			newState = handleItemDelete(state, action);
			newState.selectedNoteTags = removeItemFromArray(newState.selectedNoteTags.splice(0), 'id', action.id);
			break;

		case 'FOLDER_UPDATE_ALL':
			newState = Object.assign({}, state);
			newState.folders = action.items;
			break;

		case 'FOLDER_SET_COLLAPSED':
			newState = folderSetCollapsed(state, action);
			break;

		case 'FOLDER_TOGGLE':
			if (state.collapsedFolderIds.indexOf(action.id) >= 0) {
				newState = folderSetCollapsed(state, Object.assign({ collapsed: false }, action));
			} else {
				newState = folderSetCollapsed(state, Object.assign({ collapsed: true }, action));
			}
			break;

		case 'FOLDER_SET_COLLAPSED_ALL':
			newState = Object.assign({}, state);
			newState.collapsedFolderIds = action.ids.slice();
			break;

		case 'TAG_UPDATE_ALL':
			newState = Object.assign({}, state);
			newState.tags = action.items;
			break;

		case 'TAG_SELECT':
			newState.selectedTagId = action.id;
			if (!action.id) {
				newState.notesParentType = defaultNotesParentType(state, 'Tag');
			} else {
				newState.notesParentType = 'Tag';
			}
			newState.selectedNoteIds = [];
			break;

		case 'TAG_UPDATE_ONE':
			{
				// We only want to update the selected note tags if the tag belongs to the currently open note
				const selectedNoteHasTag = !!state.selectedNoteTags.find(tag => tag.id === action.item.id);
				newState = updateOneItem(state, action);
				if (selectedNoteHasTag) newState = updateOneItem(newState, action, 'selectedNoteTags');
			}
			break;

		case 'NOTE_TAG_REMOVE':
			{
				newState = updateOneItem(state, action, 'tags');
				const tagRemoved = action.item;
				newState.selectedNoteTags = removeItemFromArray(newState.selectedNoteTags.splice(0), 'id', tagRemoved.id);
			}
			break;

		case 'EDITOR_NOTE_STATUS_SET':

			{
				const newStatuses = Object.assign({}, state.editorNoteStatuses);
				newStatuses[action.id] = action.status;
				newState = Object.assign({}, state, { editorNoteStatuses: newStatuses });
			}
			break;

		case 'EDITOR_NOTE_STATUS_REMOVE':

			{
				const newStatuses = Object.assign({}, state.editorNoteStatuses);
				delete newStatuses[action.id];
				newState = Object.assign({}, state, { editorNoteStatuses: newStatuses });
			}
			break;

		case 'FOLDER_UPDATE_ONE':
		case 'MASTERKEY_UPDATE_ONE':
			newState = updateOneItem(state, action);
			break;

		case 'FOLDER_DELETE':
			newState = handleItemDelete(newState, action);
			break;

		case 'MASTERKEY_UPDATE_ALL':
			newState = Object.assign({}, state);
			newState.masterKeys = action.items;
			break;

		case 'MASTERKEY_SET_NOT_LOADED':
			newState = Object.assign({}, state);
			newState.notLoadedMasterKeys = action.ids;
			break;

		case 'MASTERKEY_ADD_NOT_LOADED':
			{
				if (state.notLoadedMasterKeys.indexOf(action.id) < 0) {
					newState = Object.assign({}, state);
					const keys = newState.notLoadedMasterKeys.slice();
					keys.push(action.id);
					newState.notLoadedMasterKeys = keys;
				}
			}
			break;

		case 'MASTERKEY_REMOVE_NOT_LOADED':
			{
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
			{
				newState = Object.assign({}, state);
				const searches = newState.searches.slice();
				searches.push(action.search);
				newState.searches = searches;
			}
			break;

		case 'SEARCH_UPDATE':
			{
				const searches = newState.searches.slice();
				let found = false;
				for (let i = 0; i < searches.length; i++) {
					if (searches[i].id === action.search.id) {
						searches[i] = Object.assign({}, action.search);
						found = true;
						break;
					}
				}

				if (!found) searches.push(action.search);

				if (!action.search.query_pattern) {
					newState.notesParentType = defaultNotesParentType(state, 'Search');
				} else {
					newState.notesParentType = 'Search';
				}

				newState.searches = searches;
			}
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
			newState.selectedNoteIds = [];
			break;

		case 'APP_STATE_SET':
			newState = Object.assign({}, state);
			newState.appState = action.state;
			break;

		case 'SYNC_HAS_DISABLED_SYNC_ITEMS':
			newState = Object.assign({}, state);
			newState.hasDisabledSyncItems = true;
			break;

		case 'ENCRYPTION_HAS_DISABLED_ITEMS':
			newState = Object.assign({}, state);
			newState.hasDisabledEncryptionItems = action.value;
			break;

		case 'CLIPPER_SERVER_SET':
			{
				newState = Object.assign({}, state);
				const clipperServer = Object.assign({}, newState.clipperServer);
				if ('startState' in action) clipperServer.startState = action.startState;
				if ('port' in action) clipperServer.port = action.port;
				newState.clipperServer = clipperServer;
			}
			break;

		case 'DECRYPTION_WORKER_SET':
			{
				newState = Object.assign({}, state);
				const decryptionWorker = Object.assign({}, newState.decryptionWorker);
				for (const n in action) {
					if (!action.hasOwnProperty(n) || n === 'type') continue;
					decryptionWorker[n] = action[n];
				}
				newState.decryptionWorker = decryptionWorker;
			}
			break;

		case 'RESOURCE_FETCHER_SET':
			{
				newState = Object.assign({}, state);
				const rf = Object.assign({}, action);
				delete rf.type;
				newState.resourceFetcher = rf;
			}
			break;

		case 'LOAD_CUSTOM_CSS':
			newState = Object.assign({}, state);
			newState.customCss = action.css;
			break;

		case 'TEMPLATE_UPDATE_ALL':
			newState = Object.assign({}, state);
			newState.templates = action.templates;
			break;

		case 'SET_NOTE_TAGS':
			newState = Object.assign({}, state);
			newState.selectedNoteTags = action.items;
			break;

		case 'PLUGIN_DIALOG_SET':
			{
				if (!action.pluginName) throw new Error('action.pluginName not specified');
				newState = Object.assign({}, state);
				const newPlugins = Object.assign({}, newState.plugins);
				const newPlugin = newState.plugins[action.pluginName] ? Object.assign({}, newState.plugins[action.pluginName]) : {};
				if ('open' in action) newPlugin.dialogOpen = action.open;
				newPlugins[action.pluginName] = newPlugin;
				newState.plugins = newPlugins;
			}
			break;
		}
	} catch (error) {
		error.message = `In reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}

	if (action.type.indexOf('NOTE_UPDATE') === 0 || action.type.indexOf('FOLDER_UPDATE') === 0 || action.type.indexOf('TAG_UPDATE') === 0) {
		newState = Object.assign({}, newState);
		newState.hasEncryptedItems = stateHasEncryptedItems(newState);
	}

	if (action.type === 'NOTE_DELETE') {
		newState = handleHistory(newState, action);
	}

	return newState;
};

module.exports = { reducer, defaultState, stateUtils, MAX_HISTORY };
