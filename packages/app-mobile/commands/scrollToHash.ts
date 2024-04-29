import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import NavService from '@joplin/lib/services/NavService';

export const declaration: CommandDeclaration = {
	name: 'scrollToHash',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, hash: string) => {
			const selectedNoteIds = context.state.selectedNoteIds;
			if (selectedNoteIds.length === 0) {
				throw new Error('Unable to scroll to hash -- no note open.');
			}

			await NavService.go('Note', {
				noteId: selectedNoteIds[0],
				noteHash: hash,
			});
		},
	};
};
