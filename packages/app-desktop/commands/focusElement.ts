import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'focusElement',
};

export interface FocusElementOptions {
	moveCursorToStart: boolean;
}

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, target: string, options?: FocusElementOptions) => {
			if (target === 'noteBody') return CommandService.instance().execute('focusElementNoteBody', options);
			if (target === 'noteList') return CommandService.instance().execute('focusElementNoteList');
			if (target === 'sideBar') return CommandService.instance().execute('focusElementSideBar');
			if (target === 'noteTitle') return CommandService.instance().execute('focusElementNoteTitle', options);
			if (target === 'toolbar') return CommandService.instance().execute('focusElementToolbar', options);
			throw new Error(`Invalid focus target: ${target}`);
		},
	};
};
