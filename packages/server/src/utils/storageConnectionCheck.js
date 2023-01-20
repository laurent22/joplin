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
const loadStorageDriver_1 = require("../models/items/storage/loadStorageDriver");
const parseStorageConnectionString_1 = require("../models/items/storage/parseStorageConnectionString");
const types_1 = require("./types");
const uuidgen_1 = require("./uuidgen");
function default_1(connection, db, models) {
    return __awaiter(this, void 0, void 0, function* () {
        const storageConfig = typeof connection === 'string' ? (0, parseStorageConnectionString_1.default)(connection) : connection;
        if (storageConfig.type === types_1.StorageDriverType.Database)
            return 'Database storage is special and cannot be checked this way. If the connection to the database was successful then the storage driver should work too.';
        const driver = yield (0, loadStorageDriver_1.default)(storageConfig, db, { assignDriverId: false });
        const itemId = `testingconnection${(0, uuidgen_1.default)(8)}`;
        const itemContent = Buffer.from((0, uuidgen_1.default)(8));
        const context = { models };
        try {
            yield driver.write(itemId, itemContent, context);
        }
        catch (error) {
            error.message = `Could not write content to storage: ${error.message}`;
            throw error;
        }
        if (!(yield driver.exists(itemId, context))) {
            throw new Error(`Written item does not exist: ${itemId}`);
        }
        const readContent = yield driver.read(itemId, context);
        if (readContent.toString() !== itemContent.toString())
            throw new Error(`Could not read back written item. Expected: ${itemContent.toString()}. Got: ${readContent.toString()}`);
        yield driver.delete(itemId, context);
        if (yield driver.exists(itemId, context)) {
            throw new Error(`Deleted item still exist: ${itemId}`);
        }
        return 'Item was written, read back and deleted without any error.';
    });
}
exports.default = default_1;
//# sourceMappingURL=storageConnectionCheck.js.map