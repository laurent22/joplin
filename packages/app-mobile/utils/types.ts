import { State } from '@joplin/lib/reducer';

export interface AppState extends State {
	showPanelsDialog: boolean;
	isOnMobileData: boolean;
	keyboardVisible: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Route is the redux NAV action payload (folderId/tagId/noteId/etc.); noteSideMenuOptions is set per-screen with heterogeneous shapes. Typing both requires a coordinated refactor across the mobile codebase
	route: any;
	smartFilterId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Route is the redux NAV action payload (folderId/tagId/noteId/etc.); noteSideMenuOptions is set per-screen with heterogeneous shapes. Typing both requires a coordinated refactor across the mobile codebase
	noteSideMenuOptions: any;
	disableSideMenuGestures: boolean;
	noteEditorVisible: boolean;
	syncWizardVisible: boolean;
	noteVisiblePanes: string[];
}
