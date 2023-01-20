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
const fs_extra_1 = require("fs-extra");
const errors_1 = require("../../../utils/errors");
const types_1 = require("../../../utils/types");
const StorageDriverBase_1 = require("./StorageDriverBase");
class StorageDriverFs extends StorageDriverBase_1.default {
    constructor(id, config) {
        super(id, Object.assign({ type: types_1.StorageDriverType.Filesystem }, config));
        this.pathCreated_ = {};
    }
    createParentDirectories(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const p = path.split('/');
            p.pop();
            const basename = p.join('/');
            if (this.pathCreated_[basename])
                return;
            yield (0, fs_extra_1.mkdirp)(basename);
            this.pathCreated_[basename] = true;
        });
    }
    itemPath(itemId) {
        return `${this.config.path}/${itemId.substr(0, 2).toLowerCase()}/${itemId.substr(2, 2).toLowerCase()}/${itemId}`;
    }
    write(itemId, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const itemPath = this.itemPath(itemId);
            yield this.createParentDirectories(itemPath);
            yield (0, fs_extra_1.writeFile)(itemPath, content);
        });
    }
    read(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield (0, fs_extra_1.readFile)(this.itemPath(itemId));
                return result;
            }
            catch (error) {
                if (error.code === 'ENOENT')
                    throw new errors_1.CustomError(`Not found: ${itemId}`, errors_1.ErrorCode.NotFound);
                throw error;
            }
        });
    }
    delete(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const itemIds = Array.isArray(itemId) ? itemId : [itemId];
            for (const id of itemIds) {
                try {
                    yield (0, fs_extra_1.remove)(this.itemPath(id));
                }
                catch (error) {
                    if (error.code === 'ENOENT')
                        throw new errors_1.CustomError(`Not found: ${itemId}`, errors_1.ErrorCode.NotFound);
                    throw error;
                }
            }
        });
    }
    exists(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, fs_extra_1.pathExists)(this.itemPath(itemId));
        });
    }
}
exports.default = StorageDriverFs;
//# sourceMappingURL=StorageDriverFs.js.map