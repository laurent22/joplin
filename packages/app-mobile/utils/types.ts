import { State } from '@joplin/lib/reducer';

export interface AppState extends State {
	showPanelsDialog: boolean;
	isOnMobileData: boolean;
	keyboardVisible: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- `route` is the redux NAV action payload (heterogeneous fields like folderId/tagId/noteId/etc.); typing it requires a coordinated refactor across the mobile codebase
	route: any;
	smartFilterId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- `noteSideMenuOptions` is set per-screen with heterogeneous shapes; typing it requires a coordinated refactor across the mobile codebase
	noteSideMenuOptions: any;
	disableSideMenuGestures: boolean;
	noteEditorVisible: boolean;
	syncWizardVisible: boolean;
	noteVisiblePanes: string[];
}
