import { State } from '@joplin/lib/reducer';

export interface AppState extends State {
	sideMenuOpenPercent: number;
	isOnMobileData: boolean;
	route: any;
	smartFilterId: string;
	noteSideMenuOptions: any;
	disableSideMenuGestures: boolean;
}
