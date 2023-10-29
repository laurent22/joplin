"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("api");
const types_1 = require("api/types");
const fs = require('fs-extra');
const path = require('path');
function destDir(context) {
    return context.destPath;
}
function resourceDir(context) {
    return context.destPath + '/resources';
}
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield api_1.default.interop.registerExportModule({
                description: 'JSON Export Directory',
                format: 'json',
                target: types_1.FileSystemItem.Directory,
                isNoteArchive: false,
                onInit: (context) => __awaiter(this, void 0, void 0, function* () {
                    yield fs.mkdirp(destDir(context));
                    yield fs.mkdirp(resourceDir(context));
                }),
                onProcessItem: (context, _itemType, item) => __awaiter(this, void 0, void 0, function* () {
                    const filePath = destDir(context) + '/' + item.id + '.json';
                    const serialized = JSON.stringify(item);
                    yield fs.writeFile(filePath, serialized, 'utf8');
                }),
                onProcessResource: (context, _resource, filePath) => __awaiter(this, void 0, void 0, function* () {
                    const destPath = resourceDir(context) + '/' + path.basename(filePath);
                    yield fs.copy(filePath, destPath);
                }),
                onClose: (_context) => __awaiter(this, void 0, void 0, function* () { }),
            });
            yield api_1.default.interop.registerImportModule({
                description: 'JSON Export Directory',
                format: 'json',
                sources: [types_1.FileSystemItem.Directory],
                isNoteArchive: false,
                onExec: (context) => __awaiter(this, void 0, void 0, function* () {
                    // In this case importing is a lot more complicated due to the need to avoid
                    // duplicate IDs, to validate data and ensure note links and 
                    // resources are still working properly.
                    // See InteropService_Importer_Raw for an example.
                    console.info('Not implemented! Importing from:', context);
                }),
            });
        });
    },
});
//# sourceMappingURL=index.js.map