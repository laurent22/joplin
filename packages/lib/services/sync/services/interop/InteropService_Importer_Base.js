"use strict";
/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: 0 */
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = require("../../models/Setting");
const shim_1 = require("../../shim");
class InteropService_Importer_Base {
    constructor() {
        this.metadata_ = null;
        this.sourcePath_ = '';
        this.options_ = {};
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    setMetadata(md) {
        this.metadata_ = md;
    }
    metadata() {
        return this.metadata_;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async init(sourcePath, options) {
        this.sourcePath_ = sourcePath;
        this.options_ = options;
    }
    async exec(_result) { return null; }
    async temporaryDirectory_(createIt) {
        const md5 = require('md5');
        const tempDir = `${Setting_1.default.value('tempDir')}/${md5(Math.random() + Date.now())}`;
        if (createIt)
            await shim_1.default.fsDriver().mkdir(tempDir);
        return tempDir;
    }
}
exports.default = InteropService_Importer_Base;
