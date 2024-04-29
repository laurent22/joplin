import { State } from '@joplin/lib/reducer';

// An open plugin panel is any panel that can be shown in the panel viewer dialog.
export interface OpenPluginPanels {
	[handle: string]: { pluginId: string };
}

export interface AppState extends State {
	sideMenuOpenPercent: number;
	showPanelsDialog: boolean;
	openPluginPanels: OpenPluginPanels;
	isOnMobileData: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	route: any;
	smartFilterId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	noteSideMenuOptions: any;
	disableSideMenuGestures: boolean;
}
