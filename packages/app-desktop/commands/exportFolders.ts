import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import InteropService from '@joplin/lib/services/interop/InteropService';
import { ExportOptions, FileSystemItem } from '@joplin/lib/services/interop/types';
import shim from '@joplin/lib/shim';

export const declaration: CommandDeclaration = {
	name: 'exportFolders',
};

export const runtime = (): CommandRuntime => {
	return {
		// "targetPath" should be a file for JEX export (because the format can
		// contain multiple folders) or a directory otherwise.
		execute: async (_context: any, folderIds: string[], format: string, targetPath: string) => {
			const exportOptions: ExportOptions = {
				sourceFolderIds: folderIds,
				path: targetPath,
				format: format,
				target: FileSystemItem.Directory,
			};

			const targetMustBeFile = format === 'jex';
			const targetIsDir = await shim.fsDriver().isDirectory(targetPath);

			if (targetMustBeFile && targetIsDir) {
				throw new Error(`Format "${format}" can only be exported to a file`);
			}

			if (format === 'jex' || !targetIsDir) {
				exportOptions.target = FileSystemItem.File;
			}

			return InteropService.instance().export(exportOptions);
		},
	};
};
