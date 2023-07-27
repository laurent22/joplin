import { ReactElement } from 'react';

export interface CustomSettingSection {
	component: ReactElement;
	icon: string;
	title: string;
	keywords: string[];
}

export type UpdateSettingValueCallback = (key: string, value: any)=> Promise<void>;
