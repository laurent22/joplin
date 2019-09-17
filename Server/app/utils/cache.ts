interface CacheEntry {
	object: any,
	timestamp: number,
}

interface CacheEntries {
	[key: string]: CacheEntry,
}

class Cache {

	cache:CacheEntries = {};

	async setAny(key:string, o:any):Promise<void> {
		this.cache[key] = {
			object: o,
			timestamp: Date.now(),
		};
	}

	async setObject(key:string, object:Object):Promise<void> {
		this.setAny(key, object);
	}

	async getAny(key:string):Promise<any> {
		if (!this.cache[key]) return null;
		return this.cache[key].object;
	}

	async object(key:string):Promise<object> {
		return this.getAny(key) as object;
	}

}

const cache:Cache = new Cache();

export default cache;
