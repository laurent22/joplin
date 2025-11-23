"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = require("../models/Setting");
const ItemChange_1 = require("../models/ItemChange");
const dayMs = 86400000;
class ItemChangeUtils {
    static async deleteProcessedChanges(itemMinTtl = dayMs * 90) {
        const lastProcessedChangeIds = [
            Setting_1.default.value('resourceService.lastProcessedChangeId'),
            Setting_1.default.value('searchEngine.lastProcessedChangeId'),
            Setting_1.default.value('revisionService.lastProcessedChangeId'),
        ];
        const lowestChangeId = Math.min(...lastProcessedChangeIds);
        await ItemChange_1.default.deleteOldChanges(lowestChangeId, itemMinTtl);
    }
}
exports.default = ItemChangeUtils;
