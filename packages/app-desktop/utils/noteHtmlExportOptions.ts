import { ExportModuleOutputFormat, ExportOptions, FileSystemItem } from '@joplin/lib/services/interop/types';

// The options to export one note to an HTML file, before printing it or converting it to PDF.
const noteHtmlExportOptions = (noteId: string, path: string, options: Partial<ExportOptions> = {}): ExportOptions => {
	return {
		path,
		format: ExportModuleOutputFormat.Html,
		target: FileSystemItem.File,
		sourceNoteIds: [noteId],
		// The PDF export and printing ask first.
		decryptLockedNotes: true,
		// The note was chosen by the user, so it is exported even if it is a conflict.
		includeConflicts: true,
		customCss: '',
		...options,
	};
};

export default noteHtmlExportOptions;
