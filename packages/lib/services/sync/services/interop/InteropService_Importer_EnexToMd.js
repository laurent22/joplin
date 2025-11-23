"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enexImporterExec = void 0;
const import_enex_1 = require("../../import-enex");
const InteropService_Importer_Base_1 = require("./InteropService_Importer_Base");
const Folder_1 = require("../../models/Folder");
const path_utils_1 = require("../../path-utils");
const shim_1 = require("../../shim");
const { filename } = require('../../path-utils');
const doImportEnex = async (destFolder, sourcePath, options) => {
    if (!destFolder) {
        const folderTitle = await Folder_1.default.findUniqueItemTitle(filename(sourcePath));
        destFolder = await Folder_1.default.save({ title: folderTitle });
    }
    await (0, import_enex_1.default)(destFolder.id, sourcePath, options);
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const enexImporterExec = async (result, destinationFolder, sourcePath, fileExtensions, options) => {
    sourcePath = (0, path_utils_1.rtrimSlashes)(sourcePath);
    if (await shim_1.default.fsDriver().isDirectory(sourcePath)) {
        const stats = await shim_1.default.fsDriver().readDirStats(sourcePath);
        for (const stat of stats) {
            const fullPath = `${sourcePath}/${stat.path}`;
            if (!fileExtensions.includes((0, path_utils_1.fileExtension)(fullPath).toLowerCase()))
                continue;
            try {
                await doImportEnex(null, fullPath, options);
            }
            catch (error) {
                result.warnings.push(`When importing "${fullPath}": ${error.message}`);
            }
        }
    }
    else {
        await doImportEnex(destinationFolder, sourcePath, options);
    }
    return result;
};
exports.enexImporterExec = enexImporterExec;
class InteropService_Importer_EnexToMd extends InteropService_Importer_Base_1.default {
    async exec(result) {
        return (0, exports.enexImporterExec)(result, this.options_.destinationFolder, this.sourcePath_, this.metadata().fileExtensions, this.options_);
    }
}
exports.default = InteropService_Importer_EnexToMd;
