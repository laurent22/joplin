interface CacheEntry {
	object: any;
	timestamp: number;
}

interface CacheEntries {
	[key: string]: CacheEntry;
}

class Cache {

	cache: CacheEntries = {};

	private async setAny(key: string, o: any): Promise<void> {
		this.cache[key] = {
			object: JSON.stringify(o),
			timestamp: Date.now(),
		};
	}

	async setObject(key: string, object: Object): Promise<void> {
		if (!object) return;
		return this.setAny(key, object);
	}

	private async getAny(key: string): Promise<any> {
		if (!this.cache[key]) return null;
		try {
			const output = JSON.parse(this.cache[key].object);
			return output;
		} catch (error) {
			throw new Error(`Cannot unserialize object: ${key}: ${error.message}: ${this.cache[key].object}`);
		}
	}

	async object(key: string): Promise<object> {
		return this.getAny(key) as object;
	}

	async delete(key: string | string[]): Promise<void> {
		const keys = typeof key === 'string' ? [key] : key;
		for (const k of keys) delete this.cache[k];
	}

	async clearAll(): Promise<void> {
		this.cache = {};
	}

}

const cache: Cache = new Cache();

export default cache;
