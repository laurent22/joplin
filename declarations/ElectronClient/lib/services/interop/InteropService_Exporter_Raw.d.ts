declare const InteropService_Exporter_Base: any;
export default class InteropService_Exporter_Raw extends InteropService_Exporter_Base {
    init(destDir: string): Promise<void>;
    processItem(itemType: number, item: any): Promise<void>;
    processResource(_resource: any, filePath: string): Promise<void>;
    close(): Promise<void>;
}
export {};
