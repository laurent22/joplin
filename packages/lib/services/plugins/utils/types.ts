export enum PluginPermission {
	Model = 'model',
}

export interface Screenshot {
	src: string;
	label: string;
}

export interface PluginManifest {
	manifest_version: number;
	id: string;
	name: string;
	version: string;
	app_min_version: string;
	author?: string;
	description?: string;
	homepage_url?: string;
	repository_url?: string;
	keywords?: string[];
	categories?: string[];
	screenshots?: Screenshot[];
	permissions?: PluginPermission[];

	// Private keys
	_package_hash?: string;
	_publish_hash?: string;
	_publish_commit?: string;
	_npm_package_name?: string;
	_obsolete?: boolean;
	_recommended?: boolean;
}
