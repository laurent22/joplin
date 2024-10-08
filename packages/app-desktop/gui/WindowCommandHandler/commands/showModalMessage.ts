import { CommandDeclaration, CommandRuntime, CommandContext } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'showModalMessage',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, message: string) => {
			context.dispatch({
				type: 'SHOW_MODAL_MESSAGE',
				message,
			});
		},
	};
};
