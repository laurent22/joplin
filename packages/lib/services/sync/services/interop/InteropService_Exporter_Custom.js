"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Exporter_Base_1 = require("./InteropService_Exporter_Base");
class InteropService_Exporter_Custom extends InteropService_Exporter_Base_1.default {
    constructor(module) {
        super();
        this.module_ = null;
        this.module_ = module;
    }
    async init(destPath, options) {
        this.customContext_ = {
            destPath: destPath,
            options: options,
        };
        return this.module_.onInit(this.customContext_);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async processItem(itemType, item) {
        return this.module_.onProcessItem(this.customContext_, itemType, item);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async processResource(resource, filePath) {
        return this.module_.onProcessResource(this.customContext_, resource, filePath);
    }
    async close() {
        return this.module_.onClose(this.customContext_);
    }
}
exports.default = InteropService_Exporter_Custom;
