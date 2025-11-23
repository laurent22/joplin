"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseModel_1 = require("../BaseModel");
const syncInfoUtils_1 = require("../services/synchronizer/syncInfoUtils");
const BaseItem_1 = require("./BaseItem");
const uuid_1 = require("../uuid");
class MasterKey extends BaseItem_1.default {
    static tableName() {
        return 'master_keys';
    }
    static modelType() {
        return BaseModel_1.default.TYPE_MASTER_KEY;
    }
    static encryptionSupported() {
        return false;
    }
    static latest() {
        let output = null;
        const syncInfo = (0, syncInfoUtils_1.localSyncInfo)();
        for (const mk of syncInfo.masterKeys) {
            if (!output || output.updated_time < mk.updated_time) {
                output = mk;
            }
        }
        return output;
    }
    static allWithoutEncryptionMethod(masterKeys, methods) {
        return masterKeys.filter(m => !methods.includes(m.encryption_method));
    }
    static async all() {
        return (0, syncInfoUtils_1.localSyncInfo)().masterKeys;
    }
    static async allIds() {
        return (0, syncInfoUtils_1.localSyncInfo)().masterKeys.map(k => k.id);
    }
    static async count() {
        return (0, syncInfoUtils_1.localSyncInfo)().masterKeys.length;
    }
    static async load(id) {
        return (0, syncInfoUtils_1.localSyncInfo)().masterKeys.find(mk => mk.id === id);
    }
    static async save(o) {
        const syncInfo = (0, syncInfoUtils_1.localSyncInfo)();
        const masterKey = Object.assign({}, o);
        if (!masterKey.id) {
            masterKey.id = uuid_1.default.create();
            masterKey.created_time = Date.now();
        }
        masterKey.updated_time = Date.now();
        const idx = syncInfo.masterKeys.findIndex(mk => mk.id === masterKey.id);
        if (idx >= 0) {
            syncInfo.masterKeys[idx] = masterKey;
        }
        else {
            syncInfo.masterKeys.push(masterKey);
        }
        (0, syncInfoUtils_1.saveLocalSyncInfo)(syncInfo);
        this.dispatch({
            type: 'MASTERKEY_UPDATE_ONE',
            item: masterKey,
        });
        return masterKey;
        // return super.save(o, options).then(item => {
        // 	this.dispatch({
        // 		type: 'MASTERKEY_UPDATE_ONE',
        // 		item: item,
        // 	});
        // 	return item;
        // });
    }
}
exports.default = MasterKey;
