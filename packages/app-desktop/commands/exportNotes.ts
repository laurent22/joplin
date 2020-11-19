import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import InteropService from '@joplin/lib/services/interop/InteropService';
import { ExportOptions, FileSystemItem } from '@joplin/lib/services/interop/types';

export const declaration: CommandDeclaration = {
	name: 'exportNotes',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: any, noteIds: string[], format: string, targetDirectoryPath: string) => {
			const exportOptions: ExportOptions = {
				path: targetDirectoryPath,
				format: format,
				target: FileSystemItem.Directory,
				sourceNoteIds: noteIds,
			};

			return InteropService.instance().export(exportOptions);
		},
	};
};
