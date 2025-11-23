"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const syncInfoUtils_1 = require("../syncInfoUtils");
async function default_1(api, _db) {
    // The local sync info cache is populated on application startup so for the
    // migration we only need to upload that local cache.
    const syncInfo = (0, syncInfoUtils_1.localSyncInfo)();
    syncInfo.version = 3;
    await (0, syncInfoUtils_1.uploadSyncInfo)(api, syncInfo);
    (0, syncInfoUtils_1.saveLocalSyncInfo)(syncInfo);
}
