"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Exporter_Base_1 = require("./InteropService_Exporter_Base");
const BaseItem_1 = require("../../models/BaseItem");
const { basename } = require('../../path-utils');
const shim_1 = require("../../shim");
class InteropService_Exporter_Raw extends InteropService_Exporter_Base_1.default {
    async init(destDir) {
        this.destDir_ = destDir;
        this.resourceDir_ = destDir ? `${destDir}/resources` : null;
        await shim_1.default.fsDriver().mkdir(this.destDir_);
        await shim_1.default.fsDriver().mkdir(this.resourceDir_);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async processItem(itemType, item) {
        const ItemClass = BaseItem_1.default.getClassByItemType(itemType);
        const serialized = await ItemClass.serialize(item);
        const filePath = `${this.destDir_}/${ItemClass.systemPath(item)}`;
        await shim_1.default.fsDriver().writeFile(filePath, serialized, 'utf-8');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async processResource(_resource, filePath) {
        const destResourcePath = `${this.resourceDir_}/${basename(filePath)}`;
        await shim_1.default.fsDriver().copy(filePath, destResourcePath);
    }
    async close() { }
}
exports.default = InteropService_Exporter_Raw;
