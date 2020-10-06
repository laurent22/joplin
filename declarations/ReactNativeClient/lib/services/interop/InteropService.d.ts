import { ModuleType, FileSystemItem, ImportModuleOutputFormat, Module, ImportOptions, ExportOptions, ImportExportResult } from './types';
export default class InteropService {
    private defaultModules_;
    private userModules_;
    private eventEmitter_;
    private static instance_;
    static instance(): InteropService;
    constructor();
    on(eventName: string, callback: Function): any;
    off(eventName: string, callback: Function): any;
    modules(): Module[];
    registerModule(module: Module): void;
    findModuleByFormat_(type: ModuleType, format: string, target?: FileSystemItem, outputFormat?: ImportModuleOutputFormat): Module;
    private modulePath;
    private newModuleFromCustomFactory;
    /**
     * NOTE TO FUTURE SELF: It might make sense to simply move all the existing
     * formatters to the `newModuleFromPath_` approach, so that there's only one way
     * to do this mapping. This isn't a priority right now (per the convo in:
     * https://github.com/laurent22/joplin/pull/1795#discussion_r322379121) but
     * we can do it if it ever becomes necessary.
     */
    newModuleByFormat_(type: ModuleType, format: string, outputFormat?: ImportModuleOutputFormat): any;
    /**
     * The existing `newModuleByFormat_` fn would load by the input format. This
     * was fine when there was a 1-1 mapping of input formats to output formats,
     * but now that we have 2 possible outputs for an `enex` input, we need to be
     * explicit with which importer we want to use.
     *
     * https://github.com/laurent22/joplin/pull/1795#pullrequestreview-281574417
     */
    newModuleFromPath_(type: ModuleType, options: any): any;
    moduleByFileExtension_(type: ModuleType, ext: string): Module;
    import(options: ImportOptions): Promise<ImportExportResult>;
    export(options: ExportOptions): Promise<ImportExportResult>;
}
