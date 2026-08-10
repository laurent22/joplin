import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'showRevisions',
};

interface ShowRevisionsDependencies {
	setShowRevisions: (show: boolean)=> void;
	isInFocusedDocument: ()=> boolean;
}

export const runtime = (comp: ShowRevisionsDependencies): CommandRuntime => {
	return {
		execute: async () => {
			comp.setShowRevisions(true);
		},
		getPriority: () => {
			return comp.isInFocusedDocument() ? 1 : 0;
		},
	};
};
