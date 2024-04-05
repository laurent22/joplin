import { CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'hideModalMessage',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async () => {
			comp.setState({ modalLayer: { visible: false, message: '' } });
		},
	};
};
