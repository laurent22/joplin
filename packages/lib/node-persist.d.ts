declare module 'node-persist' {
	export interface InitOptions {
		dir?: string;
		stringify?: (data: unknown)=> string;
		parse?: (data: string)=> unknown;
		encoding?: string;
		logging?: boolean;
		ttl?: number | boolean;
		expiredInterval?: number;
		forgiveParseErrors?: boolean;
	}

	export function init(options?: InitOptions): Promise<void>;
	export function getItem(key: string): Promise<unknown>;
	export function setItem(key: string, value: unknown, options?: unknown): Promise<void>;
	export function removeItem(key: string): Promise<void>;
	export function clear(): Promise<void>;
	export function values(): Promise<unknown[]>;
	export function keys(): Promise<string[]>;
	export function length(): Promise<number>;
	export function forEach(
		callback: (value: unknown, key: string)=> Promise<void>
	): Promise<void>;
}
