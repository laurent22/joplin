import { FormNote } from './types';
export declare function htmlToMarkdown(markupLanguage: number, html: string, originalCss: string): Promise<string>;
export declare function formNoteToNote(formNote: FormNote): Promise<any>;
