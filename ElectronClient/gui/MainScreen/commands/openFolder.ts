import { CommandRuntime, CommandDeclaration, CommandContext } from 'lib/services/CommandService';

export const declaration:CommandDeclaration = {
	name: 'openFolder',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (context:CommandContext, folderId:string) => {
			context.dispatch({
				type: 'FOLDER_SELECT',
				id: folderId,
			});
		},
	};
};
