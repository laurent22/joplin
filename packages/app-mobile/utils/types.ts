import { State } from '@joplin/lib/reducer';

export interface AppState extends State {
	sideMenuOpenPercent: number;
	showPanelsDialog: boolean;
	isOnMobileData: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	route: any;
	smartFilterId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	noteSideMenuOptions: any;
	disableSideMenuGestures: boolean;
}
