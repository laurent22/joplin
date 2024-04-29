import { defaultState } from '@joplin/lib/reducer';
import { AppState } from './types';


export const DEFAULT_ROUTE = {
	type: 'NAV_GO',
	routeName: 'Notes',
	smartFilterId: 'c3176726992c11e9ac940492261af972',
};

const appDefaultState: AppState = {
	smartFilterId: undefined,
	...defaultState,
	sideMenuOpenPercent: 0,
	route: DEFAULT_ROUTE,
	noteSelectionEnabled: false,
	noteSideMenuOptions: null,
	isOnMobileData: false,
	disableSideMenuGestures: false,
	showPanelsDialog: false,
};
export default appDefaultState;
