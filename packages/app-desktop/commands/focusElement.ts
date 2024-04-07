import CommandService, { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'focusElement',
};

export const runtime = (): CommandRuntime => {
	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		execute: async (_context: any, target: string) => {
			if (target === 'noteBody') return CommandService.instance().execute('focusElementNoteBody');
			if (target === 'noteList') return CommandService.instance().execute('focusElementNoteList');
			if (target === 'sideBar') return CommandService.instance().execute('focusElementSideBar');
			if (target === 'noteTitle') return CommandService.instance().execute('focusElementNoteTitle');
			throw new Error(`Invalid focus target: ${target}`);
		},
	};
};
