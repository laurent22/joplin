import produce from 'immer';
import Setting from '@joplin/lib/models/Setting';
import { defaultState, State } from '@joplin/lib/reducer';
import iterateItems from './gui/ResizableLayout/utils/iterateItems';
import { LayoutItem } from './gui/ResizableLayout/utils/types';
import validateLayout from './gui/ResizableLayout/utils/validateLayout';

export interface AppStateRoute {
	type: string;
	routeName: string;
	props: any;
}

export enum AppStateDialogName {
	SyncWizard = 'syncWizard',
	MasterPassword = 'masterPassword',
}

export interface AppStateDialog {
	name: AppStateDialogName;
	props: Record<string, any>;
}

export interface AppState extends State {
	route: AppStateRoute;
	navHistory: any[];
	noteVisiblePanes: string[];
	windowContentSize: any;
	watchedNoteFiles: string[];
	lastEditorScrollPercents: any;
	devToolsVisible: boolean;
	visibleDialogs: any; // empty object if no dialog is visible. Otherwise contains the list of visible dialogs.
	focusedField: string;
	layoutMoveMode: boolean;
	startupPluginsLoaded: boolean;

	// Extra reducer keys go here
	watchedResources: any;
	mainLayout: LayoutItem;
	dialogs: AppStateDialog[];
}

export function createAppDefaultState(windowContentSize: any, resourceEditWatcherDefaultState: any): AppState {
	return {
		...defaultState,
		route: {
			type: 'NAV_GO',
			routeName: 'Main',
			props: {},
		},
		navHistory: [],
		noteVisiblePanes: ['editor', 'viewer'],
		windowContentSize, // bridge().windowContentSize(),
		watchedNoteFiles: [],
		lastEditorScrollPercents: {},
		devToolsVisible: false,
		visibleDialogs: {}, // empty object if no dialog is visible. Otherwise contains the list of visible dialogs.
		focusedField: null,
		layoutMoveMode: false,
		mainLayout: null,
		startupPluginsLoaded: false,
		dialogs: [],
		...resourceEditWatcherDefaultState,
	};
}

export default function(state: AppState, action: any) {
	let newState = state;

	try {
		switch (action.type) {

		case 'NAV_BACK':
		case 'NAV_GO':

			{
				const goingBack = action.type === 'NAV_BACK';

				if (goingBack && !state.navHistory.length) break;

				const currentRoute = state.route;

				newState = Object.assign({}, state);
				const newNavHistory = state.navHistory.slice();

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
				newState.navHistory = newNavHistory;
				newState.route = action;
			}
			break;

		case 'STARTUP_PLUGINS_LOADED':

			// When all startup plugins have loaded, we also recreate the
			// main layout to ensure that it is updated in the UI. There's
			// probably a cleaner way to do this, but for now that will do.
			if (state.startupPluginsLoaded !== action.value) {
				newState = {
					...newState,
					startupPluginsLoaded: action.value,
					mainLayout: JSON.parse(JSON.stringify(newState.mainLayout)),
				};
			}
			break;

		case 'WINDOW_CONTENT_SIZE_SET':

			newState = Object.assign({}, state);
			newState.windowContentSize = action.size;
			break;

		case 'NOTE_VISIBLE_PANES_TOGGLE':

			{
				const getNextLayout = (currentLayout: any) => {
					currentLayout = panes.length === 2 ? 'both' : currentLayout[0];

					let paneOptions;
					if (state.settings.layoutButtonSequence === Setting.LAYOUT_EDITOR_VIEWER) {
						paneOptions = ['editor', 'viewer'];
					} else if (state.settings.layoutButtonSequence === Setting.LAYOUT_EDITOR_SPLIT) {
						paneOptions = ['editor', 'both'];
					} else if (state.settings.layoutButtonSequence === Setting.LAYOUT_VIEWER_SPLIT) {
						paneOptions = ['viewer', 'both'];
					} else {
						paneOptions = ['editor', 'viewer', 'both'];
					}

					const currentLayoutIndex = paneOptions.indexOf(currentLayout);
					const nextLayoutIndex = currentLayoutIndex === paneOptions.length - 1 ? 0 : currentLayoutIndex + 1;

					const nextLayout = paneOptions[nextLayoutIndex];
					return nextLayout === 'both' ? ['editor', 'viewer'] : [nextLayout];
				};

				newState = Object.assign({}, state);

				const panes = state.noteVisiblePanes.slice();
				newState.noteVisiblePanes = getNextLayout(panes);
			}
			break;

		case 'NOTE_VISIBLE_PANES_SET':

			newState = Object.assign({}, state);
			newState.noteVisiblePanes = action.panes;
			break;

		case 'MAIN_LAYOUT_SET':

			newState = {
				...state,
				mainLayout: action.value,
			};
			break;

		case 'MAIN_LAYOUT_SET_ITEM_PROP':

			{
				let newLayout = produce(state.mainLayout, (draftLayout: LayoutItem) => {
					iterateItems(draftLayout, (_itemIndex: number, item: LayoutItem, _parent: LayoutItem) => {
						if (item.key === action.itemKey) {
							(item as any)[action.propName] = action.propValue;
							return false;
						}
						return true;
					});
				});

				if (newLayout !== state.mainLayout) newLayout = validateLayout(newLayout);

				newState = {
					...state,
					mainLayout: newLayout,
				};
			}

			break;

		case 'NOTE_FILE_WATCHER_ADD':

			if (newState.watchedNoteFiles.indexOf(action.id) < 0) {
				newState = Object.assign({}, state);
				const watchedNoteFiles = newState.watchedNoteFiles.slice();
				watchedNoteFiles.push(action.id);
				newState.watchedNoteFiles = watchedNoteFiles;
			}
			break;

		case 'NOTE_FILE_WATCHER_REMOVE':

			{
				newState = Object.assign({}, state);
				const idx = newState.watchedNoteFiles.indexOf(action.id);
				if (idx >= 0) {
					const watchedNoteFiles = newState.watchedNoteFiles.slice();
					watchedNoteFiles.splice(idx, 1);
					newState.watchedNoteFiles = watchedNoteFiles;
				}
			}
			break;

		case 'NOTE_FILE_WATCHER_CLEAR':

			if (state.watchedNoteFiles.length) {
				newState = Object.assign({}, state);
				newState.watchedNoteFiles = [];
			}
			break;

		case 'EDITOR_SCROLL_PERCENT_SET':

			{
				newState = Object.assign({}, state);
				const newPercents = Object.assign({}, newState.lastEditorScrollPercents);
				newPercents[action.noteId] = action.percent;
				newState.lastEditorScrollPercents = newPercents;
			}
			break;

		case 'NOTE_DEVTOOLS_TOGGLE':
			newState = Object.assign({}, state);
			newState.devToolsVisible = !newState.devToolsVisible;
			break;

		case 'NOTE_DEVTOOLS_SET':
			newState = Object.assign({}, state);
			newState.devToolsVisible = action.value;
			break;

		case 'VISIBLE_DIALOGS_ADD':
			newState = Object.assign({}, state);
			newState.visibleDialogs = Object.assign({}, newState.visibleDialogs);
			newState.visibleDialogs[action.name] = true;
			break;

		case 'VISIBLE_DIALOGS_REMOVE':
			newState = Object.assign({}, state);
			newState.visibleDialogs = Object.assign({}, newState.visibleDialogs);
			delete newState.visibleDialogs[action.name];
			break;

		case 'FOCUS_SET':

			newState = Object.assign({}, state);
			newState.focusedField = action.field;
			break;

		case 'FOCUS_CLEAR':

			// A field can only clear its own state
			if (action.field === state.focusedField) {
				newState = Object.assign({}, state);
				newState.focusedField = null;
			}
			break;

		case 'DIALOG_OPEN':
		case 'DIALOG_CLOSE':

			{
				let isOpen = true;

				if (action.type === 'DIALOG_CLOSE') {
					isOpen = false;
				} else { // DIALOG_OPEN
					isOpen = action.isOpen !== false;
				}

				newState = Object.assign({}, state);

				if (isOpen) {
					const newDialogs = newState.dialogs.slice();

					if (newDialogs.find(d => d.name === action.name)) throw new Error(`Trying to open a dialog is already open: ${action.name}`);

					newDialogs.push({
						name: action.name,
						props: action.props || {},
					});

					newState.dialogs = newDialogs;
				} else {
					if (!newState.dialogs.find(d => d.name === action.name)) throw new Error(`Trying to close a dialog that is not open: ${action.name}`);
					const newDialogs = newState.dialogs.slice().filter(d => d.name !== action.name);
					newState.dialogs = newDialogs;
				}
			}
			break;

		case 'LAYOUT_MOVE_MODE_SET':

			newState = {
				...state,
				layoutMoveMode: action.value,
			};
			break;

		}
	} catch (error) {
		error.message = `In reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}

	return newState;
}
