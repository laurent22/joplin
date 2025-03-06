import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'openTag',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, tagId: string) => {
			context.dispatch({
				type: 'TAG_SELECT',
				id: tagId,
			});
		},
	};
};
