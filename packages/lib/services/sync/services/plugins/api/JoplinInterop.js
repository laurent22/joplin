"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_1 = require("../../interop/InteropService");
const InteropService_Exporter_Custom_1 = require("../../interop/InteropService_Exporter_Custom");
const InteropService_Importer_Custom_1 = require("../../interop/InteropService_Importer_Custom");
const Module_1 = require("../../interop/Module");
const types_1 = require("../../interop/types");
/**
 * Provides a way to create modules to import external data into Joplin or to export notes into any arbitrary format.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/json_export)
 *
 * To implement an import or export module, you would simply define an object with various event handlers that are called
 * by the application during the import/export process.
 *
 * See the documentation of the [[ExportModule]] and [[ImportModule]] for more information.
 *
 * You may also want to refer to the Joplin API documentation to see the list of properties for each item (note, notebook, etc.) - https://joplinapp.org/help/api/references/rest_api
 *
 * <span class="platform-desktop">desktop</span>: While it is possible to register import and export
 * modules on mobile, there is no GUI to activate them.
 */
class JoplinInterop {
    async registerExportModule(module) {
        const internalModule = (0, Module_1.makeExportModule)(Object.assign(Object.assign({}, module), { type: types_1.ModuleType.Exporter, fileExtensions: module.fileExtensions ? module.fileExtensions : [] }), () => new InteropService_Exporter_Custom_1.default(module));
        return InteropService_1.default.instance().registerModule(internalModule);
    }
    async registerImportModule(module) {
        const internalModule = (0, Module_1.makeImportModule)(Object.assign(Object.assign({}, module), { type: types_1.ModuleType.Importer, fileExtensions: module.fileExtensions ? module.fileExtensions : [] }), () => {
            return new InteropService_Importer_Custom_1.default(module);
        });
        return InteropService_1.default.instance().registerModule(internalModule);
    }
}
exports.default = JoplinInterop;
