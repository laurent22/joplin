import InteropService_Importer_Base from './InteropService_Importer_Base';
import { ImportExportResult, Module } from './types';
export default class InteropService_Importer_Custom extends InteropService_Importer_Base {
    private module_;
    constructor(handler: Module);
    exec(result: ImportExportResult): Promise<void>;
}
