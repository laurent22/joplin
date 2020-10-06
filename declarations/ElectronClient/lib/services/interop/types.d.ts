export interface CustomImportContext {
    sourcePath: string;
    options: ImportOptions;
    warnings: string[];
}
export interface CustomExportContext {
    destPath: string;
    options: ExportOptions;
}
export declare enum ModuleType {
    Importer = "importer",
    Exporter = "exporter"
}
export declare enum FileSystemItem {
    File = "file",
    Directory = "directory"
}
export declare enum ImportModuleOutputFormat {
    Markdown = "md",
    Html = "html"
}
export interface Module {
    type: ModuleType;
    format: string;
    fileExtensions: string[];
    description: string;
    path?: string;
    isNoteArchive?: boolean;
    isCustom?: boolean;
    sources?: FileSystemItem[];
    importerClass?: string;
    outputFormat?: ImportModuleOutputFormat;
    isDefault?: boolean;
    fullLabel?: Function;
    onExec?(context: any): Promise<void>;
    target?: FileSystemItem;
    onInit?(context: any): Promise<void>;
    onProcessItem?(context: any, itemType: number, item: any): Promise<void>;
    onProcessResource?(context: any, resource: any, filePath: string): Promise<void>;
    onClose?(context: any): Promise<void>;
}
export interface ImportOptions {
    path?: string;
    format?: string;
    modulePath?: string;
    destinationFolderId?: string;
    destinationFolder?: any;
    outputFormat?: ImportModuleOutputFormat;
}
export interface ExportOptions {
    format?: string;
    path?: string;
    sourceFolderIds?: string[];
    sourceNoteIds?: string[];
    modulePath?: string;
    target?: FileSystemItem;
}
export interface ImportExportResult {
    warnings: string[];
}
export declare function defaultImportExportModule(type: ModuleType): Module;
