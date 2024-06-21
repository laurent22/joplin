import produce from 'immer';
import Setting from '@joplin/lib/models/Setting';
import { defaultState, State } from '@joplin/lib/reducer';
import iterateItems from './gui/ResizableLayout/utils/iterateItems';
import { LayoutItem } from './gui/ResizableLayout/utils/types';
import validateLayout from './gui/ResizableLayout/utils/validateLayout';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('app.reducer');

export interface AppStateRoute {
	type: string;
	routeName: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	props: any;
}

export enum AppStateDialogName {
	SyncWizard = 'syncWizard',
	MasterPassword = 'masterPassword',
}

export interface AppStateDialog {
	name: AppStateDialogName;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	props: Record<string, any>;
}

export interface EditorScrollPercents {
	[noteId: string]: number;
}

export interface AppState extends State {
	route: AppStateRoute;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	navHistory: any[];
	noteVisiblePanes: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	windowContentSize: any;
	watchedNoteFiles: string[];
	lastEditorScrollPercents: EditorScrollPercents;
	devToolsVisible: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	visibleDialogs: any; // empty object if no dialog is visible. Otherwise contains the list of visible dialogs.
	focusedField: string;
	layoutMoveMode: boolean;
	startupPluginsLoaded: boolean;

	// Extra reducer keys go here
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	watchedResources: any;
	mainLayout: LayoutItem;
	dialogs: AppStateDialog[];
	isResettingLayout: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
		isResettingLayout: false,
		...resourceEditWatcherDefaultState,
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

				newState = { ...state };
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

			newState = { ...state };
			newState.windowContentSize = action.size;
			break;

		case 'NOTE_VISIBLE_PANES_TOGGLE':

			{
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

				newState = { ...state };

				const panes = state.noteVisiblePanes.slice();
				newState.noteVisiblePanes = getNextLayout(panes);
			}
			break;

		case 'NOTE_VISIBLE_PANES_SET':

			newState = { ...state };
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
				if (!state.mainLayout) {
					logger.warn('MAIN_LAYOUT_SET_ITEM_PROP: Trying to set an item prop on the layout, but layout is empty: ', JSON.stringify(action));
				} else {
					let newLayout = produce(state.mainLayout, (draftLayout: LayoutItem) => {
						iterateItems(draftLayout, (_itemIndex: number, item: LayoutItem, _parent: LayoutItem) => {
							if (!item) {
								logger.warn('MAIN_LAYOUT_SET_ITEM_PROP: Found an empty item in layout: ', JSON.stringify(state.mainLayout));
							} else {
								if (item.key === action.itemKey) {
									// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
									(item as any)[action.propName] = action.propValue;
									return false;
								}
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
			}

			break;

		case 'NOTE_FILE_WATCHER_ADD':

			if (newState.watchedNoteFiles.indexOf(action.id) < 0) {
				newState = { ...state };
				const watchedNoteFiles = newState.watchedNoteFiles.slice();
				watchedNoteFiles.push(action.id);
				newState.watchedNoteFiles = watchedNoteFiles;
			}
			break;

		case 'NOTE_FILE_WATCHER_REMOVE':

			{
				newState = { ...state };
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
				newState = { ...state };
				newState.watchedNoteFiles = [];
			}
			break;

		case 'EDITOR_SCROLL_PERCENT_SET':

			{
				newState = { ...state };
				const newPercents = { ...newState.lastEditorScrollPercents };
				newPercents[action.noteId] = action.percent;
				newState.lastEditorScrollPercents = newPercents;
			}
			break;

		case 'NOTE_DEVTOOLS_TOGGLE':
			newState = { ...state };
			newState.devToolsVisible = !newState.devToolsVisible;
			break;

		case 'NOTE_DEVTOOLS_SET':
			newState = { ...state };
			newState.devToolsVisible = action.value;
			break;

		case 'VISIBLE_DIALOGS_ADD':
			newState = { ...state };
			newState.visibleDialogs = { ...newState.visibleDialogs };
			newState.visibleDialogs[action.name] = true;
			break;

		case 'VISIBLE_DIALOGS_REMOVE':
			newState = { ...state };
			newState.visibleDialogs = { ...newState.visibleDialogs };
			delete newState.visibleDialogs[action.name];
			break;

		case 'FOCUS_SET':

			newState = { ...state };
			newState.focusedField = action.field;
			break;

		case 'FOCUS_CLEAR':

			// A field can only clear its own state
			if (action.field === state.focusedField) {
				newState = { ...state };
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

				newState = { ...state };

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


		case 'RESET_LAYOUT':
			newState = {
				...state,
				isResettingLayout: action.value,
			};
			break;

		}

	} catch (error) {
		error.message = `In reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}

	return newState;
}
