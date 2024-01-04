
export type GitSourceData = {
	cloneUrl: string;
	branch: string;
	commit: string;

	appTypes: AppType[];
};

export type FileSourceData = {
	path: string;
	appTypes: AppType[];
};

export type PluginSource = GitSourceData|FileSourceData;

export interface AllRepositoryData {
	[pluginId: string]: PluginSource;
}

export enum AppType {
	Desktop = 'desktop',
	Mobile = 'mobile',
	All = 'all',
}
