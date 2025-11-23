"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const locale_1 = require("../../locale");
const InteropService_Exporter_Base_1 = require("./InteropService_Exporter_Base");
const InteropService_Exporter_Raw_1 = require("./InteropService_Exporter_Raw");
const shim_1 = require("../../shim");
class InteropService_Exporter_Jex extends InteropService_Exporter_Base_1.default {
    async init(destPath) {
        if (await shim_1.default.fsDriver().isDirectory(destPath))
            throw new Error(`Path is a directory: ${destPath}`);
        this.tempDir_ = await this.temporaryDirectory_(false);
        this.destPath_ = destPath;
        this.rawExporter_ = new InteropService_Exporter_Raw_1.default();
        await this.rawExporter_.init(this.tempDir_);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async processItem(itemType, item) {
        return this.rawExporter_.processItem(itemType, item);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async processResource(resource, filePath) {
        return this.rawExporter_.processResource(resource, filePath);
    }
    async close() {
        const stats = await shim_1.default.fsDriver().readDirStats(this.tempDir_, { recursive: true });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const filePaths = stats.filter((a) => !a.isDirectory()).map((a) => a.path);
        if (!filePaths.length)
            throw new Error((0, locale_1._)('There is no data to export.'));
        await shim_1.default.fsDriver().tarCreate({
            strict: true,
            portable: true,
            file: this.destPath_,
            cwd: this.tempDir_,
        }, filePaths);
        await shim_1.default.fsDriver().remove(this.tempDir_);
    }
}
exports.default = InteropService_Exporter_Jex;
