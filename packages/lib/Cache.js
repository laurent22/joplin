"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodePersist = require("node-persist");
const os = require("os");
class Cache {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns cached item of any type
    async getItem(name) {
        let output = null;
        try {
            const storage = await Cache.storage();
            output = await storage.getItem(name);
        }
        catch (error) {
            // console.info(error);
            // Defaults to returning null
        }
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accepts any value to be cached
    async setItem(name, value, ttl = null) {
        try {
            const storage = await Cache.storage();
            const options = {};
            if (ttl !== null)
                options.ttl = ttl;
            await storage.setItem(name, value, options);
        }
        catch (error) {
            // Defaults to not saving to cache
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns node-persist storage object
    static async storage() {
        if (Cache.storage_)
            return Cache.storage_;
        Cache.storage_ = nodePersist;
        await Cache.storage_.init({ dir: `${os.tmpdir()}/joplin-cache`, ttl: 1000 * 60 });
        return Cache.storage_;
    }
}
exports.default = Cache;
//# sourceMappingURL=Cache.js.map