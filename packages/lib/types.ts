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

export type DownloadHandler = Pick<DownloadController, 'handleChunk'>;

export type FetchBlobOptions = {
	path?: string;
	method?: string;
	maxRedirects?: number;
	maxRetry?: number;
	timeout?: number;
	ignoreTlsErrors?: boolean;
	headers?: Record<string, string>;
	downloadController?: DownloadHandler;
	// Defaults to true, only respected on mobile:
	overwrite?: boolean;
};
