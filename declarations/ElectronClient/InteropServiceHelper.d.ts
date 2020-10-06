import { Module } from 'lib/services/interop/types';
interface ExportNoteOptions {
    customCss?: string;
    sourceNoteIds?: string[];
    sourceFolderIds?: string[];
    printBackground?: boolean;
    pageSize?: string;
    landscape?: boolean;
}
export default class InteropServiceHelper {
    private static exportNoteToHtmlFile;
    private static exportNoteTo_;
    static exportNoteToPdf(noteId: string, options?: ExportNoteOptions): Promise<unknown>;
    static printNote(noteId: string, options?: ExportNoteOptions): Promise<unknown>;
    static defaultFilename(noteId: string, fileExtension: string): Promise<string>;
    static export(_dispatch: Function, module: Module, options?: ExportNoteOptions): Promise<void>;
}
export {};
