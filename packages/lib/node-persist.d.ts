declare module 'node-persist' {
	export interface InitOptions {
		dir?: string;
		stringify?: (data: any) => string;
		parse?: (data: string) => any;
		encoding?: string;
		logging?: boolean;
		ttl?: number | boolean;
		expiredInterval?: number;
		forgiveParseErrors?: boolean;
	}

	export function init(options?: InitOptions): Promise<void>;
	export function getItem(key: string): Promise<any>;
	export function setItem(key: string, value: any, options?: any): Promise<void>;
	export function removeItem(key: string): Promise<void>;
	export function clear(): Promise<void>;
	export function values(): Promise<any[]>;
	export function keys(): Promise<string[]>;
	export function length(): Promise<number>;
	export function forEach(callback: (value: any, key: string) => Promise<void>): Promise<void>;
}
