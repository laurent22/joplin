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
const errors_1 = require("../../../utils/errors");
const types_1 = require("../../../utils/types");
const StorageDriverBase_1 = require("./StorageDriverBase");
class StorageDriverMemory extends StorageDriverBase_1.default {
    constructor(id, config = null) {
        super(id, Object.assign({ type: types_1.StorageDriverType.Memory }, config));
        this.data_ = {};
    }
    write(itemId, content) {
        return __awaiter(this, void 0, void 0, function* () {
            this.data_[itemId] = content;
        });
    }
    read(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(itemId in this.data_))
                throw new errors_1.CustomError(`No such item: ${itemId}`, errors_1.ErrorCode.NotFound);
            return this.data_[itemId];
        });
    }
    delete(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const itemIds = Array.isArray(itemId) ? itemId : [itemId];
            for (const id of itemIds) {
                delete this.data_[id];
            }
        });
    }
    exists(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            return itemId in this.data_;
        });
    }
}
exports.default = StorageDriverMemory;
//# sourceMappingURL=StorageDriverMemory.js.map