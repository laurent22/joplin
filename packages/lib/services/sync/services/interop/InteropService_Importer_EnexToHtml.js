"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Importer_Base_1 = require("./InteropService_Importer_Base");
const InteropService_Importer_EnexToMd_1 = require("./InteropService_Importer_EnexToMd");
class InteropService_Importer_EnexToHtml extends InteropService_Importer_Base_1.default {
    async exec(result) {
        return (0, InteropService_Importer_EnexToMd_1.enexImporterExec)(result, this.options_.destinationFolder, this.sourcePath_, this.metadata().fileExtensions, Object.assign(Object.assign({}, this.options_), { outputFormat: 'html' }));
    }
}
exports.default = InteropService_Importer_EnexToHtml;
