import CommandService, { CommandRuntime, CommandDeclaration } from '../lib/services/CommandService';

export const declaration:CommandDeclaration = {
	name: 'focusElement',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async ({ target }:any) => {
			if (target === 'noteBody') return CommandService.instance().execute('focusElementNoteBody');
			if (target === 'noteList') return CommandService.instance().execute('focusElementNoteList');
			if (target === 'sideBar') return CommandService.instance().execute('focusElementSideBar');
			if (target === 'noteTitle') return CommandService.instance().execute('focusElementNoteTitle');
			throw new Error(`Invalid focus target: ${target}`);
		},
	};
};
