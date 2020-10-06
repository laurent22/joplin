import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import { ExportOptions, Module } from './types';
export default class InteropService_Exporter_Custom extends InteropService_Exporter_Base {
    private customContext_;
    private module_;
    constructor(module: Module);
    init(destPath: string, options: ExportOptions): Promise<void>;
    processItem(itemType: number, item: any): Promise<void>;
    processResource(resource: any, filePath: string): Promise<void>;
    close(): Promise<void>;
}
