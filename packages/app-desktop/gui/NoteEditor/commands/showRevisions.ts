import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'showRevisions',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async () => {
			comp.setShowRevisions(true);
		},
		getPriority: () => {
			return comp.isInFocusedDocument() ? 1 : 0;
		},
	};
};
