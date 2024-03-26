import { State } from '@joplin/lib/reducer';

export interface AppState extends State {
	sideMenuOpenPercent: number;
	showPanelsDialog: boolean;
	isOnMobileData: boolean;
	route: any;
	smartFilterId: string;
	noteSideMenuOptions: any;
	disableSideMenuGestures: boolean;
	themeId: number;
}
