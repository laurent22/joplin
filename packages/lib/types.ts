import { DownloadController } from './downloadController';
import { Env } from './models/Setting';

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
	headers?: Record<string, string>;
	downloadController?: DownloadController;
};

export interface Session {
	id: string;
	user_id: string;
}

export interface Options {
	baseUrl(): string;
	userContentBaseUrl(): string;
	username(): string;
	password(): string;
	session(): Session | null;
	env?: Env;
}

export enum ExecOptionsResponseFormat {
	Json = 'json',
	Text = 'text',
}

export enum ExecOptionsTarget {
	String = 'string',
	File = 'file',
}

export interface ExecOptions {
	responseFormat?: ExecOptionsResponseFormat;
	target?: ExecOptionsTarget;
	path?: string;
	source?: string;
}

export interface ServerApiInterface {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	exec(method: string, path?: string, query?: Record<string, any>, body?: any, headers?: any, options?: ExecOptions | null): Promise<any>;
}

export type ServerApiClass = new (options: Options)=> ServerApiInterface;
