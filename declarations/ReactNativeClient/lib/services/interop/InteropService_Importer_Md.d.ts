import { ImportExportResult } from './types';
declare const InteropService_Importer_Base: any;
export default class InteropService_Importer_Md extends InteropService_Importer_Base {
    exec(result: ImportExportResult): Promise<ImportExportResult>;
    importDirectory(dirPath: string, parentFolderId: string): Promise<void>;
    /**
     * Parse text for links, attempt to find local file, if found create Joplin resource
     * and update link accordingly.
     */
    importLocalImages(filePath: string, md: string): Promise<string>;
    importFile(filePath: string, parentFolderId: string): Promise<any>;
}
export {};
