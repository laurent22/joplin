import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'focusSearch',
	label: () => _('Search in all the notes'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			if (comp.searchElement_) comp.searchElement_.focus();
		},
	};
};
