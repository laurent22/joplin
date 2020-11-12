export enum PluginPermission {
	Model = 'model',
}

export interface PluginManifest {
	manifest_version: number;
	name: string;
	version: string;
	description?: string;
	homepage_url?: string;
	permissions?: PluginPermission[];
}
