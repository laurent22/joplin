import { PluginSettings } from '../../../../services/plugins/PluginService';
import { PluginManifest } from '../../../../services/plugins/utils/types';


export interface PluginItem {
	manifest: PluginManifest;
	installed: boolean;
	enabled: boolean;
	deleted: boolean;
	devMode: boolean;
	builtIn: boolean;
	hasBeenUpdated: boolean;
}

export interface ItemEvent {
	item: PluginItem;
}


export interface OnPluginSettingChangeEvent {
	value: PluginSettings;
}

export type OnPluginSettingChangeHandler = (event: OnPluginSettingChangeEvent)=> void;
