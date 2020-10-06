declare const InteropService_Exporter_Base: any;
export default class InteropService_Exporter_Md extends InteropService_Exporter_Base {
    init(destDir: string): Promise<void>;
    makeDirPath_(item: any, pathPart?: string, findUniqueFilename?: boolean): Promise<string>;
    relaceLinkedItemIdsByRelativePaths_(item: any): Promise<string>;
    replaceResourceIdsByRelativePaths_(noteBody: string, relativePathToRoot: string): Promise<string>;
    replaceNoteIdsByRelativePaths_(noteBody: string, relativePathToRoot: string): Promise<string>;
    replaceItemIdsByRelativePaths_(noteBody: string, linkedItemIds: string[], paths: any, fn_createRelativePath: Function): Promise<string>;
    prepareForProcessingItemType(itemType: number, itemsToExport: any[]): Promise<void>;
    processItem(_itemType: number, item: any): Promise<void>;
    processResource(_resource: any, filePath: string): Promise<void>;
    close(): Promise<void>;
}
export {};
