export default class InteropService_Exporter_Base {
    private context_;
    private metadata_;
    init(destDir: string, options?: any): Promise<void>;
    prepareForProcessingItemType(itemType: number, itemsToExport: any[]): Promise<void>;
    processItem(itemType: number, item: any): Promise<void>;
    processResource(resource: any, filePath: string): Promise<void>;
    close(): Promise<void>;
    setMetadata(md: any): void;
    metadata(): any;
    updateContext(context: any): void;
    context(): any;
    temporaryDirectory_(createIt: boolean): Promise<string>;
}
