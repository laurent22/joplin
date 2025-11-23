"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportProgressState = exports.ExportModuleOutputFormat = exports.ImportModuleOutputFormat = exports.FileSystemItem = exports.ModuleType = void 0;
var ModuleType;
(function (ModuleType) {
    ModuleType["Importer"] = "importer";
    ModuleType["Exporter"] = "exporter";
})(ModuleType || (exports.ModuleType = ModuleType = {}));
var FileSystemItem;
(function (FileSystemItem) {
    FileSystemItem["File"] = "file";
    FileSystemItem["Directory"] = "directory";
})(FileSystemItem || (exports.FileSystemItem = FileSystemItem = {}));
var ImportModuleOutputFormat;
(function (ImportModuleOutputFormat) {
    ImportModuleOutputFormat["Markdown"] = "md";
    ImportModuleOutputFormat["Html"] = "html";
})(ImportModuleOutputFormat || (exports.ImportModuleOutputFormat = ImportModuleOutputFormat = {}));
var ExportModuleOutputFormat;
(function (ExportModuleOutputFormat) {
    ExportModuleOutputFormat["Enex"] = "enex";
    ExportModuleOutputFormat["Html"] = "html";
    ExportModuleOutputFormat["Jex"] = "jex";
    ExportModuleOutputFormat["Markdown"] = "md";
    ExportModuleOutputFormat["MarkdownFrontMatter"] = "md_frontmatter";
    ExportModuleOutputFormat["Memory"] = "memory";
    ExportModuleOutputFormat["Pdf"] = "pdf";
    ExportModuleOutputFormat["Raw"] = "raw";
})(ExportModuleOutputFormat || (exports.ExportModuleOutputFormat = ExportModuleOutputFormat = {}));
var ExportProgressState;
(function (ExportProgressState) {
    ExportProgressState[ExportProgressState["QueuingItems"] = 0] = "QueuingItems";
    ExportProgressState[ExportProgressState["Exporting"] = 1] = "Exporting";
    ExportProgressState[ExportProgressState["Closing"] = 2] = "Closing";
})(ExportProgressState || (exports.ExportProgressState = ExportProgressState = {}));
