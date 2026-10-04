export type ImportErrors = Record<string, string>;

export type PluginSubmissionSource = 'npm' | 'repository';

export interface PluginSubmissionOptions {
	source: PluginSubmissionSource;
}

export interface NpmPackage {
	name: string;
	version: string;
	date: Date;
}
