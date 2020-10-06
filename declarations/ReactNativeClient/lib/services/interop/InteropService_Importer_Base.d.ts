import { ImportExportResult } from './types';
export default class InteropService_Importer_Base {
    private metadata_;
    protected sourcePath_: string;
    protected options_: any;
    setMetadata(md: any): void;
    metadata(): any;
    init(sourcePath: string, options: any): Promise<void>;
    exec(result: ImportExportResult): Promise<void>;
    temporaryDirectory_(createIt: boolean): Promise<string>;
}
