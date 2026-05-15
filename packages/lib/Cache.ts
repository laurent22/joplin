import * as nodePersist from 'node-persist';
import * as os from 'os';

class Cache {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for node-persist storage object
	private static storage_: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns cached item of any type
	public async getItem(name: string): Promise<any> {
		let output = null;
		try {
			const storage = await Cache.storage();
			output = await storage.getItem(name);
		} catch (error) {
			// console.info(error);
			// Defaults to returning null
		}
		return output;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accepts any value to be cached
	public async setItem(name: string, value: any, ttl: number | null = null): Promise<void> {
		try {
			const storage = await Cache.storage();
			const options: nodePersist.InitOptions = {};
			if (ttl !== null) options.ttl = ttl;
			await storage.setItem(name, value, options);
		} catch (error) {
			// Defaults to not saving to cache
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns node-persist storage object
	public static async storage(): Promise<any> {
		if (Cache.storage_) return Cache.storage_;
		Cache.storage_ = nodePersist;
		await Cache.storage_.init({ dir: `${os.tmpdir()}/joplin-cache`, ttl: 1000 * 60 });
		return Cache.storage_;
	}
}

export default Cache;
