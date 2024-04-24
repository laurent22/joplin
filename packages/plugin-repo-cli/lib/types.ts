export type ImportErrors = Record<string, string>;

export interface NpmPackage {
	name: string;
	version: string;
	date: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactoring of old code
export type Manifest = Record<string, any>;
export interface Manifests {
	[pluginId: string]: Manifest;
}
