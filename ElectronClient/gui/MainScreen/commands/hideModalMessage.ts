import { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';

export const declaration:CommandDeclaration = {
	name: 'hideModalMessage',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			comp.setState({ modalLayer: { visible: false, message: '' } });
		},
	};
};
