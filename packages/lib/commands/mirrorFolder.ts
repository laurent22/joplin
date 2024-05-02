import { CommandRuntime, CommandDeclaration } from '../services/CommandService';
import { _ } from '../locale';
import FileMirroringService from '../services/filesync/FileMirroringService';
import shim from '../shim';

export const declaration: CommandDeclaration = {
	name: 'mirrorFolder',
	label: () => _('Mirror folder'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: unknown, folderId: string) => {
			const outputPath = await shim.pickFolder();
			await FileMirroringService.instance().mirrorFolder(outputPath, folderId);
		},
		enabledCondition: '',
	};
};
