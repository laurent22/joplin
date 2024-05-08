import { CommandRuntime, CommandDeclaration } from '../services/CommandService';
import { _ } from '../locale';
import FolderMirroringService from '../services/filesync/FolderMirroringService';
import shim from '../shim';

export const declaration: CommandDeclaration = {
	name: 'mirrorFolder',
	label: () => _('Mirror folder'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: unknown, folderId: string) => {
			const outputPath = await shim.pickFolder();
			await FolderMirroringService.instance().mirrorFolder(outputPath, folderId);
		},
		enabledCondition: '',
	};
};
