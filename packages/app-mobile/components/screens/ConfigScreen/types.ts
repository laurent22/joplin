import { ReactElement } from 'react';

export interface CustomSettingSection {
	component: ReactElement;
	icon: string;
	title: string;
	keywords: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export type UpdateSettingValueCallback = (key: string, value: any)=> void|Promise<void>;

export interface PluginStatusRecord {
	[pluginId: string]: boolean;
}
