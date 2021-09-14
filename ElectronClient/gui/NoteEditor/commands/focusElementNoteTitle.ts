import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'focusElementNoteTitle',
	label: () => _('Note title'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			if (!comp.titleInputRef.current) return;
			comp.titleInputRef.current.focus();
		},
		isEnabled: ():boolean => {
			return !!comp.titleInputRef.current;
		},
	};
};
