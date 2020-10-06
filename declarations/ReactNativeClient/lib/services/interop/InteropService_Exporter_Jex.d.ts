declare const InteropService_Exporter_Base: any;
export default class InteropService_Exporter_Jex extends InteropService_Exporter_Base {
    init(destPath: string): Promise<void>;
    processItem(itemType: number, item: any): Promise<any>;
    processResource(resource: any, filePath: string): Promise<any>;
    close(): Promise<void>;
}
export {};
