import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'hideModalMessage',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			context.dispatch({ type: 'HIDE_MODAL_MESSAGE' });
		},
	};
};
