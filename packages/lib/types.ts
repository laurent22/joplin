import { DownloadController } from './downloadController';

export enum ApplicationPlatform {
	Unknown = 0,
	Windows = 1,
	Linux = 2,
	MacOs = 3,
	Android = 4,
	Ios = 5,
}

export enum ApplicationType {
	Unknown = 0,
	Desktop = 1,
	Mobile = 2,
	Cli = 3,
}

export type FetchBlobOptions = {
	path?: string;
	method?: string;
	maxRedirects?: number;
	timeout?: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	headers?: any;
	downloadController?: DownloadController;
};
