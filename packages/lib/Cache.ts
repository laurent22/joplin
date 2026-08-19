import { tmpdir } from 'os';

// node-persist is untyped; preserve the runtime shape used here.
interface Storage {
	init(options: { dir: string; ttl: number }): Promise<void>;
	getItem(name: string): Promise<unknown>;
	setItem(name: string, value: unknown, options: { ttl?: number }): Promise<void>;
}

export default class Cache {
	private static storage_: Storage | null = null;

	public async getItem(name: string) {
		let output: unknown = null;
		try {
			const storage = await Cache.storage();
			output = await storage.getItem(name);
		} catch (_error) {
			// Defaults to returning null
		}
		return output;
	}

	public async setItem(name: string, value: unknown, ttl: number | null = null) {
		try {
			const storage = await Cache.storage();
			const options: { ttl?: number } = {};
			if (ttl !== null) options.ttl = ttl;
			await storage.setItem(name, value, options);
		} catch (_error) {
			// Defaults to not saving to cache
		}
	}

	public static async storage() {
		if (Cache.storage_) return Cache.storage_;
		Cache.storage_ = require('node-persist') as Storage;
		await Cache.storage_.init({ dir: `${tmpdir()}/joplin-cache`, ttl: 1000 * 60 });
		return Cache.storage_;
	}
}
