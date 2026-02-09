import reducer from '@joplin/lib/reducer';
import { AppState } from './types';
import appDefaultState from './appDefaultState';
import fastDeepEqual = require('fast-deep-equal');
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('appReducer');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const navHistory: any[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function historyCanGoBackTo(route: any) {
	if (route.routeName === 'Folder') return false;

	// This is an intermediate screen that acts more like a modal -- it should be skipped in the
	// navigation history.
	if (route.routeName === 'DocumentScanner') return false;

	// There's no point going back to these screens in general and, at least in OneDrive case,
	// it can be buggy to do so, due to incorrectly relying on global state (reg.syncTarget...)
	if (route.routeName === 'OneDriveLogin') return false;
	if (route.routeName === 'DropboxLogin') return false;

	return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const appReducer = (state = appDefaultState, action: any) => {
	let newState = state;
	let historyGoingBack = false;

	try {
		switch (action.type) {

		case 'NAV_BACK':
		case 'NAV_GO':

			if (action.type === 'NAV_BACK') {
				if (!navHistory.length) break;

				const newAction = navHistory.pop();
				action = newAction ? newAction : navHistory.pop();

				historyGoingBack = true;
			}

			{
				const currentRoute = state.route;

				if (!historyGoingBack && historyCanGoBackTo(currentRoute)) {
					const previousRoute = navHistory.length && navHistory[navHistory.length - 1];
					const isDifferentRoute = !previousRoute || !fastDeepEqual(navHistory[navHistory.length - 1], currentRoute);

					// Avoid multiple consecutive duplicate screens in the navigation history -- these can make
					// pressing "back" seem to have no effect.
					if (isDifferentRoute) {
						navHistory.push(currentRoute);
					}
				}

				if (action.clearHistory) {
					navHistory.splice(0, navHistory.length);
				}

				newState = { ...state };

				newState.selectedNoteHash = '';

				if (currentRoute.routeName === 'Search' && action.routeName === 'Notes') {
					// Force a reload of the note list
					newState.notesSource = '';
				}

				if (action.routeName === 'Search') {
					newState.notesParentType = 'Search';
				}

				if ('noteId' in action) {
					newState.selectedNoteIds = action.noteId ? [action.noteId] : [];
				}

				if ('folderId' in action) {
					newState.selectedFolderId = action.folderId;
					newState.selectedFolderIds = [action.folderId];
					newState.notesParentType = 'Folder';
				}

				if ('tagId' in action) {
					newState.selectedTagId = action.tagId;
					newState.selectedTagIds = [action.tagId];
					newState.notesParentType = 'Tag';
				}

				if ('smartFilterId' in action) {
					newState.smartFilterId = action.smartFilterId;
					newState.selectedSmartFilterId = action.smartFilterId;
					newState.notesParentType = 'SmartFilter';
				}

				if ('itemType' in action) {
					newState.selectedItemType = action.itemType;
				}

				if ('noteHash' in action) {
					newState.selectedNoteHash = action.noteHash;
				}

				if ('sharedData' in action) {
					newState.sharedData = action.sharedData;
				} else {
					newState.sharedData = null;
				}

				newState.route = action;
				newState.historyCanGoBack = !!navHistory.length;

				logger.debug('Navigated to route:', newState.route?.routeName, 'with notesParentType:', newState.notesParentType);
			}
			break;

		case 'SIDE_MENU_TOGGLE':

			newState = { ...state };
			newState.showSideMenu = !newState.showSideMenu;
			break;

		case 'SIDE_MENU_OPEN':

			newState = { ...state };
			newState.showSideMenu = true;
			break;

		case 'SIDE_MENU_CLOSE':

			newState = { ...state };
			newState.showSideMenu = false;
			break;

		case 'SET_PLUGIN_PANELS_DIALOG_VISIBLE':
			newState = { ...state };
			newState.showPanelsDialog = action.visible;
			break;

		case 'NOTE_SELECTION_TOGGLE':

			{
				newState = { ...state };

				const noteId = action.id;
				const newSelectedNoteIds = state.selectedNoteIds.slice();
				const existingIndex = state.selectedNoteIds.indexOf(noteId);

				if (existingIndex >= 0) {
					newSelectedNoteIds.splice(existingIndex, 1);
				} else {
					newSelectedNoteIds.push(noteId);
				}

				newState.selectedNoteIds = newSelectedNoteIds;
				newState.noteSelectionEnabled = !!newSelectedNoteIds.length;
			}
			break;

		case 'NOTE_SELECTION_START':

			if (!state.noteSelectionEnabled) {
				newState = { ...state };
				newState.noteSelectionEnabled = true;
				newState.selectedNoteIds = [action.id];
			}
			break;

		case 'NOTE_SELECTION_END':

			newState = { ...state };
			newState.noteSelectionEnabled = false;
			newState.selectedNoteIds = [];
			break;

		case 'NOTE_SIDE_MENU_OPTIONS_SET':

			newState = { ...state };
			newState.noteSideMenuOptions = action.options;
			break;

		case 'SET_SIDE_MENU_TOUCH_GESTURES_DISABLED':
			newState = { ...state };
			newState.disableSideMenuGestures = action.disableSideMenuGestures;
			break;

		case 'MOBILE_DATA_WARNING_UPDATE':

			newState = { ...state };
			newState.isOnMobileData = action.isOnMobileData;
			break;

		case 'KEYBOARD_VISIBLE_CHANGE':
			newState = { ...state, keyboardVisible: action.visible };
			break;

		case 'NOTE_EDITOR_VISIBLE_CHANGE':
			newState = { ...state, noteEditorVisible: action.visible };
			break;

		case 'SYNC_WIZARD_VISIBLE_CHANGE':
			newState = { ...state, syncWizardVisible: action.visible };
			break;
		}
	} catch (error) {
		error.message = `In reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}

	return reducer(newState, action) as AppState;
};

export default appReducer;
