import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'refreshNote',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			context.dispatch({
				type: 'EDITOR_NOTE_NEEDS_RELOAD',
			});
		},
	};
};
