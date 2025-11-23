"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Importer_Base_1 = require("./InteropService_Importer_Base");
const InteropService_Importer_Raw_1 = require("./InteropService_Importer_Raw");
const { filename } = require('../../path-utils');
const shim_1 = require("../../shim");
class InteropService_Importer_Jex extends InteropService_Importer_Base_1.default {
    async exec(result) {
        const tempDir = await this.temporaryDirectory_(true);
        try {
            await shim_1.default.fsDriver().tarExtract({
                strict: true,
                portable: true,
                file: this.sourcePath_,
                cwd: tempDir,
            });
        }
        catch (error) {
            error.message = `Could not decompress "${this.sourcePath_}". The file may be corrupted. Error was: ${error.message}`;
            throw error;
        }
        if (!('defaultFolderTitle' in this.options_))
            this.options_.defaultFolderTitle = filename(this.sourcePath_);
        const importer = new InteropService_Importer_Raw_1.default();
        await importer.init(tempDir, this.options_);
        result = await importer.exec(result);
        await shim_1.default.fsDriver().remove(tempDir);
        return result;
    }
}
exports.default = InteropService_Importer_Jex;
