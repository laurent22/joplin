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
const types_1 = require("../../../utils/types");
class StorageDriverBase {
    constructor(storageId, config) {
        this.storageId_ = storageId;
        this.config_ = config;
    }
    get storageId() {
        return this.storageId_;
    }
    get config() {
        return this.config_;
    }
    get mode() {
        return this.config.mode || types_1.StorageDriverMode.ReadAndClear;
    }
    write(_itemId, _content, _context) {
        return __awaiter(this, void 0, void 0, function* () { throw new Error('Not implemented'); });
    }
    read(_itemId, _context) {
        return __awaiter(this, void 0, void 0, function* () { throw new Error('Not implemented'); });
    }
    delete(_itemId, _context) {
        return __awaiter(this, void 0, void 0, function* () { throw new Error('Not implemented'); });
    }
    exists(_itemId, _context) {
        return __awaiter(this, void 0, void 0, function* () { throw new Error('Not implemented'); });
    }
}
exports.default = StorageDriverBase;
//# sourceMappingURL=StorageDriverBase.js.map