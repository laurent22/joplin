"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class Cache {
    constructor() {
        this.cache = {};
    }
    setAny(key, o) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cache[key] = {
                object: JSON.stringify(o),
                timestamp: Date.now(),
            };
        });
    }
    setObject(key, object) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!object)
                return;
            return this.setAny(key, object);
        });
    }
    getAny(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.cache[key])
                return null;
            try {
                const output = JSON.parse(this.cache[key].object);
                return output;
            }
            catch (error) {
                throw new Error(`Cannot unserialize object: ${key}: ${error.message}: ${this.cache[key].object}`);
            }
        });
    }
    object(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getAny(key);
        });
    }
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = typeof key === 'string' ? [key] : key;
            for (const k of keys)
                delete this.cache[k];
        });
    }
    clearAll() {
        return __awaiter(this, void 0, void 0, function* () {
            this.cache = {};
        });
    }
}
const cache = new Cache();
exports.default = cache;
//# sourceMappingURL=cache.js.map