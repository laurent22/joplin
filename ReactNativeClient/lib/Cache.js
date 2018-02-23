class Cache {

	async getItem(name) {
		let output = null;
		try {
			const storage = await Cache.storage();
			output = await storage.getItem(name);
		} catch (error) {
			console.info(error);
			// Defaults to returning null
		}
		return output;
	}

	async setItem(name, value, ttl = null) {
		try {
			const storage = await Cache.storage();
			const options = {};
			if (ttl !== null) options.ttl = ttl;
			await storage.setItem(name, value, options);
		} catch (error) {
			// Defaults to not saving to cache
		}
	}

}

Cache.storage = async function() {
	if (Cache.storage_) return Cache.storage_;
	Cache.storage_ = require('node-persist');
	await Cache.storage_.init({ dir: require('os').tmpdir() + '/joplin-cache', ttl: 1000 * 60 });
	return Cache.storage_;
}

module.exports = Cache;