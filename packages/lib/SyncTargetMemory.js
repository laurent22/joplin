"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseSyncTarget_1 = require("./BaseSyncTarget");
const Setting_1 = require("./models/Setting");
const file_api_1 = require("./file-api");
const file_api_driver_memory_1 = require("./file-api-driver-memory");
const Synchronizer_1 = require("./Synchronizer");
class SyncTargetMemory extends BaseSyncTarget_1.default {
    static id() {
        return 1;
    }
    static targetName() {
        return 'memory';
    }
    static label() {
        return 'Memory';
    }
    async isAuthenticated() {
        return true;
    }
    async initFileApi() {
        const fileApi = new file_api_1.FileApi('/root', new file_api_driver_memory_1.default());
        fileApi.setLogger(this.logger());
        fileApi.setSyncTargetId(SyncTargetMemory.id());
        return fileApi;
    }
    async initSynchronizer() {
        return new Synchronizer_1.default(this.db(), await this.fileApi(), Setting_1.default.value('appType'));
    }
}
exports.default = SyncTargetMemory;
//# sourceMappingURL=SyncTargetMemory.js.map