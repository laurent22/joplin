declare const InteropService_Exporter_Base: any;
export default class InteropService_Exporter_Html extends InteropService_Exporter_Base {
    init(path: string, options?: any): Promise<void>;
    makeDirPath_(item: any, pathPart?: string): Promise<string>;
    processNoteResources_(item: any): Promise<any>;
    processItem(_itemType: number, item: any): Promise<void>;
    processResource(resource: any, filePath: string): Promise<void>;
    close(): Promise<void>;
}
export {};
