import { defaultState } from '@joplin/lib/reducer';
import { AppState } from './types';

export const DEFAULT_ROUTE = {
	type: 'NAV_GO',
	routeName: 'Notes',
	smartFilterId: 'c3176726992c11e9ac940492261af972',
};

const appDefaultState: AppState = {
	smartFilterId: undefined,
	keyboardVisible: false,
	route: DEFAULT_ROUTE,
	noteSelectionEnabled: false,
	noteSideMenuOptions: null,
	isOnMobileData: false,
	disableSideMenuGestures: false,
	showPanelsDialog: false,
	...defaultState,

	// On mobile, it's possible to select notes that aren't in the selected folder/tag/etc.
	allowSelectionInOtherFolders: true,
};
export default appDefaultState;
