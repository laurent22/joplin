export enum PluginPermission {
	Model = 'model',
}

export interface Image {
	src: string;
	label: string;
}

export interface Icons {
	16?: string;
	32?: string;
	48?: string;
	128?: string;
}

export interface PluginManifest {
	manifest_version: number;
	id: string;
	name: string;
	version: string;
	app_min_version: string;
	app_min_version_mobile?: string;
	platforms?: string[];
	author?: string;
	description?: string;
	homepage_url?: string;
	repository_url?: string;
	keywords?: string[];
	categories?: string[];
	screenshots?: Image[];
	permissions?: PluginPermission[];
	icons?: Icons;
	promo_tile?: Image;

	// Private keys
	_package_hash?: string;
	_publish_hash?: string;
	_publish_commit?: string;
	_npm_package_name?: string;
	_obsolete?: boolean;
	_recommended?: boolean;
}
