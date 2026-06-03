import { State } from '@joplin/lib/reducer';
import type { SideMenuContentOptions } from '../components/SideMenuContentNote';

// Narrow shape of the redux NAV route that the mobile app stores in AppState
// and the navigation history. The dispatched NAV action carries more
// (heterogeneous) fields; only these are read back from state.
export interface Route {
	routeName: string;
	folderId?: string;
	noteId?: string;
	isDeleted?: boolean;
}

export interface AppState extends State {
	showPanelsDialog: boolean;
	isOnMobileData: boolean;
	keyboardVisible: boolean;
	route: Route;
	smartFilterId: string;
	noteSideMenuOptions: SideMenuContentOptions;
	disableSideMenuGestures: boolean;
	noteEditorVisible: boolean;
	syncWizardVisible: boolean;
	noteVisiblePanes: string[];
}
