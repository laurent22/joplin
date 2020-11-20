import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import InteropService from '@joplin/lib/services/interop/InteropService';
import { ExportOptions, FileSystemItem } from '@joplin/lib/services/interop/types';

export const declaration: CommandDeclaration = {
	name: 'exportFolders',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: any, folderIds: string[], format: string, targetDirectoryPath: string) => {
			const exportOptions: ExportOptions = {
				sourceFolderIds: folderIds,
				path: targetDirectoryPath,
				format: format,
				target: FileSystemItem.Directory,
			};

			return InteropService.instance().export(exportOptions);
		},
	};
};
