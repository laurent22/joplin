import { produce } from 'immer';
import Setting from '@joplin/lib/models/Setting';
import { defaultState, defaultWindowId, defaultWindowState, State, stateUtils, WindowState } from '@joplin/lib/reducer';
import iterateItems from './gui/ResizableLayout/utils/iterateItems';
import { LayoutItem } from './gui/ResizableLayout/utils/types';
import validateLayout from './gui/ResizableLayout/utils/validateLayout';
import Logger from '@joplin/utils/Logger';
import { ChatMessage } from '@joplin/lib/services/ai/types';

const logger = Logger.create('app.reducer');

export interface AiChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'error' | 'separator';
	text: string;
	editsApplied?: number;
	editsMissed?: number;

	// The raw message(s) corresponding to this event
	raw: ChatMessage[];
}

export interface AppStateRoute {
	type: string;
	routeName: string;
	props: Record<string, unknown>;
}

export enum AppStateDialogName {
	SyncWizard = 'syncWizard',
	MasterPassword = 'masterPassword',
}

export interface AppStateDialog {
	name: AppStateDialogName;
	props: Record<string, unknown>;
}

export interface NoteIdToScrollPercent {
	[noteId: string]: number;
}

export interface VisibleDialogs {
	[dialogKey: string]: boolean;
}

export interface AppWindowState extends WindowState {
	noteVisiblePanes: string[];
	editorCodeView: boolean;
	visibleDialogs: VisibleDialogs;
	dialogs: AppStateDialog[];
	devToolsVisible: boolean;
	watchedResources: Record<string, unknown>;
	// Note IDs for which the user has chosen to view the underlying Markdown
	// instead of the Whiteboard editor. Per-window, in-memory only.
	whiteboardForceMarkdown: Record<string, boolean>;
	// Whether the currently-active note in this window contains a whiteboard
	// fence. Set by the NoteEditor when it loads / saves the body, used by
	// the toolbar to show the editor toggle button. (We can't compute this
	// from the redux note list because `body` isn't in the preview fields.)
	activeNoteIsWhiteboard: boolean;
	// In window state so the conversation survives panel hide/show (the
	// layout container can swap component types and unmount the panel).
	aiChatMessages: AiChatMessage[];
	// Layout for secondary windows
	secondaryWindowLayout: LayoutItem|null;
}

interface BackgroundWindowStates {
	[windowId: string]: AppWindowState;
}

export interface AppState extends State, AppWindowState {
	backgroundWindows: BackgroundWindowStates;

	route: AppStateRoute;
	navHistory: AppStateRoute[];
	watchedNoteFiles: string[];
	focusedField: string;
	layoutMoveMode: boolean;
	startupPluginsLoaded: boolean;
	modalOverlayMessage: string|null;

	// Extra reducer keys go here
	mainLayout: LayoutItem;
	isResettingLayout: boolean;
}

export const createAppDefaultWindowState = (): AppWindowState => {
	return {
		...defaultWindowState,
		visibleDialogs: {},
		dialogs: [],
		noteVisiblePanes: ['editor', 'viewer'],
		editorCodeView: true,
		devToolsVisible: false,
		watchedResources: {},
		whiteboardForceMarkdown: {},
		activeNoteIsWhiteboard: false,
		aiChatMessages: [],
		secondaryWindowLayout: null,
	};
};

export function createAppDefaultState(resourceEditWatcherDefaultState: Partial<AppState>): AppState {
	return {
		...defaultState,
		...createAppDefaultWindowState(),
		backgroundWindows: {},
		route: {
			type: 'NAV_GO',
			routeName: 'Main',
			props: {},
		},
		navHistory: [],
		watchedNoteFiles: [],
		visibleDialogs: {}, // empty object if no dialog is visible. Otherwise contains the list of visible dialogs.
		focusedField: null,
		layoutMoveMode: false,
		mainLayout: null,
		startupPluginsLoaded: false,
		isResettingLayout: false,
		modalOverlayMessage: null,
		...resourceEditWatcherDefaultState,
	};
}

const hideBackgroundDialogsWithId = produce((state: AppState, id: string) => {
	for (const windowId of Object.keys(state.backgroundWindows)) {
		const win = state.backgroundWindows[windowId];
		if (id in win.visibleDialogs) {
			delete win.visibleDialogs[id];
		}
	}
});

const withWindowStateUpdated = <Key extends keyof AppWindowState> (
	state: AppState, windowId: string, stateKey: Key, value: (oldValue: AppWindowState[Key])=> AppWindowState[Key],
) => {
	return produce((state: AppState) => {
		const windowState = stateUtils.windowStateById(state, windowId);
		windowState[stateKey] = value(windowState[stateKey]);
	})(state);
};

interface SetLayoutPropOptions {
	key: string;
	prop: string;
	value: string;
}

const setLayoutProp = (layout: LayoutItem, { key, prop, value }: SetLayoutPropOptions) => {
	let newLayout = produce(layout, (draftLayout: LayoutItem) => {
		iterateItems(draftLayout, (_itemIndex: number, item: LayoutItem, _parent: LayoutItem) => {
			if (!item) {
				logger.warn('MAIN_LAYOUT_SET_ITEM_PROP: Found an empty item in layout: ', JSON.stringify(layout));
			} else {
				if (item.key === key) {
					(item as unknown as Record<string, unknown>)[prop] = value;
					return false;
				}
			}

			return true;
		});
	});

	if (newLayout !== layout) newLayout = validateLayout(newLayout);

	return newLayout;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Redux actions are heterogeneous; typing this would require an action-type union and many narrowing casts inside the switch
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

		case 'NOTE_VISIBLE_PANES_TOGGLE':

			{
				const getNextLayout = (currentLayout: string | string[]) => {
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
			newState = {
				...state,
				noteVisiblePanes: action.panes,
			};
			break;

		case 'EDITOR_CODE_VIEW_CHANGE':
			newState = {
				...state,
				editorCodeView: action.value,
			};
			break;

		case 'WHITEBOARD_FORCE_MARKDOWN_TOGGLE': {
			const id: unknown = action.noteId;
			// Guard against dispatchers forgetting to pass a noteId — writing
			// an `undefined` key into the map would persist a junk entry.
			if (typeof id !== 'string' || !id) break;
			const current = !!state.whiteboardForceMarkdown?.[id];
			newState = {
				...state,
				whiteboardForceMarkdown: { ...(state.whiteboardForceMarkdown || {}), [id]: !current },
			};
			break;
		}

		case 'WHITEBOARD_ACTIVE_NOTE_SET':
			newState = {
				...state,
				activeNoteIsWhiteboard: !!action.value,
			};
			break;

		case 'AI_CHAT_APPEND':
			newState = withWindowStateUpdated(
				state, action.windowId, 'aiChatMessages', messages => [...messages, action.message as AiChatMessage],
			);
			break;

		case 'AI_CHAT_ADD_TOOL_RESULT':
			newState = withWindowStateUpdated(
				state, action.windowId, 'aiChatMessages', messages => {
					let lastMessage = messages[messages.length - 1];
					if (lastMessage) {
						const toolCall = action.toolCall;
						const error = toolCall.isError;
						const editsApplied = (lastMessage.editsApplied ?? 0) + (error ? 0 : 1);
						const editsMissed = (lastMessage.editsMissed ?? 0) + (error ? 1 : 0);

						lastMessage = {
							...lastMessage,
							editsApplied,
							editsMissed,
							raw: [
								...lastMessage.raw,
								action.toolCall,
							],
						};

						return [...messages.slice(0, messages.length - 1), lastMessage];
					}

					return messages;
				},
			);
			break;

		case 'AI_CHAT_REMOVE':
			newState = withWindowStateUpdated(
				state, action.windowId, 'aiChatMessages', messages => messages.filter(m => m.id !== action.id),
			);
			break;

		case 'AI_CHAT_RESET':
			newState = withWindowStateUpdated(
				state, action.windowId, 'aiChatMessages', (): AiChatMessage[] => [],
			);
			break;

		case 'WINDOW_LAYOUT_SET':
		case 'MAIN_LAYOUT_SET':
			if ((action.windowId ?? defaultWindowId) === defaultWindowId) {
				newState = {
					...state,
					mainLayout: action.value,
				};
			} else {
				newState = withWindowStateUpdated(
					state, action.windowId, 'secondaryWindowLayout', () => action.value,
				);
			}
			break;

		case 'WINDOW_LAYOUT_SET_ITEM_PROP':
		case 'MAIN_LAYOUT_SET_ITEM_PROP': {
			const updateOption = { key: action.itemKey, prop: action.propName, value: action.propValue };

			if ((action.windowId ?? defaultWindowId) !== defaultWindowId) {
				newState = withWindowStateUpdated(
					state, action.windowId, 'secondaryWindowLayout', oldLayout => (
						setLayoutProp(oldLayout, updateOption)
					),
				);
			} else {
				newState = {
					...state,
					mainLayout: setLayoutProp(state.mainLayout, updateOption),
				};
			}

			break;
		}

		case 'SHOW_MODAL_MESSAGE':
			newState = { ...newState, modalOverlayMessage: action.message };
			break;

		case 'HIDE_MODAL_MESSAGE':
			newState = { ...newState, modalOverlayMessage: null };
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
			newState = hideBackgroundDialogsWithId(newState, action.name);
			break;

		case 'VISIBLE_DIALOGS_REMOVE':
			newState = { ...state };
			newState.visibleDialogs = { ...newState.visibleDialogs };
			delete newState.visibleDialogs[action.name];
			newState = hideBackgroundDialogsWithId(newState, action.name);
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
