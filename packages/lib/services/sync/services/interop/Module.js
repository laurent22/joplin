"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeExportModule = exports.makeImportModule = void 0;
const locale_1 = require("../../locale");
const types_1 = require("./types");
const defaultBaseMetadata = {
    fileExtensions: [],
    description: '',
    isNoteArchive: true,
    supportsMobile: true,
    isDefault: false,
    separatorAfter: false,
};
const moduleFullLabel = (metadata, moduleSource = null) => {
    const format = metadata.format.split('_')[0];
    const label = [`${format.toUpperCase()} - ${metadata.description}`];
    if (moduleSource && metadata.type === types_1.ModuleType.Importer && metadata.sources.length > 1) {
        label.push(`(${moduleSource === types_1.FileSystemItem.File ? (0, locale_1._)('File') : (0, locale_1._)('Directory')})`);
    }
    return label.join(' ');
};
const makeImportModule = (metadata, factory) => {
    const importerDefaults = Object.assign(Object.assign({}, defaultBaseMetadata), { format: '', type: types_1.ModuleType.Importer, sources: [], outputFormat: types_1.ImportModuleOutputFormat.Markdown, fullLabel: (moduleSource) => {
            return moduleFullLabel(fullMetadata, moduleSource);
        } });
    const fullMetadata = Object.assign(Object.assign({}, importerDefaults), metadata);
    return Object.assign(Object.assign({}, fullMetadata), { factory: (options = {}) => {
            const result = factory();
            result.setMetadata(Object.assign(Object.assign({}, fullMetadata), (options !== null && options !== void 0 ? options : {})));
            return result;
        } });
};
exports.makeImportModule = makeImportModule;
const makeExportModule = (metadata, factory) => {
    const exporterDefaults = Object.assign(Object.assign({}, defaultBaseMetadata), { 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        format: '', type: types_1.ModuleType.Exporter, target: types_1.FileSystemItem.File, fullLabel: (moduleSource) => {
            return moduleFullLabel(fullMetadata, moduleSource);
        } });
    const fullMetadata = Object.assign(Object.assign({}, exporterDefaults), metadata);
    return Object.assign(Object.assign({}, fullMetadata), { factory: (options = {}) => {
            const result = factory();
            result.setMetadata(Object.assign(Object.assign({}, fullMetadata), (options !== null && options !== void 0 ? options : {})));
            return result;
        } });
};
exports.makeExportModule = makeExportModule;
