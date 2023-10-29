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
const config_1 = require("../../../config");
const db_1 = require("../../../db");
const types_1 = require("../../../utils/types");
const factory_1 = require("../../factory");
const parseStorageConnectionString_1 = require("./parseStorageConnectionString");
const serializeStorageConfig_1 = require("./serializeStorageConfig");
const StorageDriverDatabase_1 = require("./StorageDriverDatabase");
const StorageDriverFs_1 = require("./StorageDriverFs");
const StorageDriverMemory_1 = require("./StorageDriverMemory");
const StorageDriverS3_1 = require("./StorageDriverS3");
function default_1(config, db, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!config)
            return null;
        options = Object.assign({ assignDriverId: true }, options);
        let storageId = 0;
        if (typeof config === 'number') {
            storageId = config;
            const models = (0, factory_1.default)(db, (0, config_1.default)());
            const storage = yield models.storage().byId(storageId);
            if (!storage)
                throw new Error(`No such storage ID: ${storageId}`);
            config = (0, parseStorageConnectionString_1.default)(storage.connection_string);
        }
        else {
            if (options.assignDriverId) {
                const models = (0, factory_1.default)(db, (0, config_1.default)());
                const connectionString = (0, serializeStorageConfig_1.default)(config);
                let storage = yield models.storage().byConnectionString(connectionString);
                if (!storage) {
                    yield models.storage().save({
                        connection_string: connectionString,
                    });
                    storage = yield models.storage().byConnectionString(connectionString);
                }
                storageId = storage.id;
            }
        }
        if (config.type === types_1.StorageDriverType.Database) {
            return new StorageDriverDatabase_1.default(storageId, Object.assign(Object.assign({}, config), { dbClientType: (0, db_1.clientType)(db) }));
        }
        if (config.type === types_1.StorageDriverType.Filesystem) {
            return new StorageDriverFs_1.default(storageId, config);
        }
        if (config.type === types_1.StorageDriverType.Memory) {
            return new StorageDriverMemory_1.default(storageId, config);
        }
        if (config.type === types_1.StorageDriverType.S3) {
            return new StorageDriverS3_1.default(storageId, config);
        }
        throw new Error(`Invalid config type: ${JSON.stringify(config)}`);
    });
}
exports.default = default_1;
//# sourceMappingURL=loadStorageDriver.js.map