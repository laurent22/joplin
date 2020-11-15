export enum PluginPermission {
	Model = 'model',
}

export interface PluginManifest {
	manifest_version: number;
	name: string;
	version: string;
	app_min_version: string;
	author?: string;
	description?: string;
	homepage_url?: string;
	permissions?: PluginPermission[];
}
