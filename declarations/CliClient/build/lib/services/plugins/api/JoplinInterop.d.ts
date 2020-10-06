import { FileSystemItem, ImportModuleOutputFormat } from 'lib/services/interop/types';
interface ExportModule {
    format: string;
    description: string;
    target: FileSystemItem;
    isNoteArchive: boolean;
    fileExtensions?: string[];
    onInit(context: any): Promise<void>;
    onProcessItem(context: any, itemType: number, item: any): Promise<void>;
    onProcessResource(context: any, resource: any, filePath: string): Promise<void>;
    onClose(context: any): Promise<void>;
}
interface ImportModule {
    format: string;
    description: string;
    isNoteArchive: boolean;
    sources: FileSystemItem[];
    fileExtensions?: string[];
    outputFormat?: ImportModuleOutputFormat;
    onExec(context: any): Promise<void>;
}
export default class JoplinInterop {
    registerExportModule(module: ExportModule): Promise<void>;
    registerImportModule(module: ImportModule): Promise<void>;
}
export {};
