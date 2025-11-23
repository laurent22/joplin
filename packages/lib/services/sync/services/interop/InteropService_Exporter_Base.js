"use strict";
/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: ["error", { "argsIgnorePattern": ".*" }], */
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = require("../../models/Setting");
const shim_1 = require("../../shim");
class InteropService_Exporter_Base {
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.context_ = {};
        this.metadata_ = null;
    }
    async init(_destDir, _options = {}) { }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async prepareForProcessingItemType(_itemType, _itemsToExport) { }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async processItem(_itemType, _item) { }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async processResource(_resource, _filePath) { }
    async close() { }
    setMetadata(md) {
        this.metadata_ = md;
    }
    metadata() {
        return this.metadata_;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    updateContext(context) {
        this.context_ = Object.assign(Object.assign({}, this.context_), context);
    }
    context() {
        return this.context_;
    }
    async temporaryDirectory_(createIt) {
        const md5 = require('md5');
        const tempDir = `${Setting_1.default.value('tempDir')}/${md5(Math.random() + Date.now())}`;
        if (createIt)
            await shim_1.default.fsDriver().mkdir(tempDir);
        return tempDir;
    }
}
exports.default = InteropService_Exporter_Base;
