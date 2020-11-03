import { CommandRuntime, CommandDeclaration } from '@joplinapp/lib/services/CommandService';
import { _ } from '@joplinapp/lib/locale';

export const declaration:CommandDeclaration = {
	name: 'focusElementNoteTitle',
	label: () => _('Note title'),
	parentLabel: () => _('Focus'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			if (!comp.titleInputRef.current) return;
			comp.titleInputRef.current.focus();
		},
		enabledCondition: 'oneNoteSelected',
	};
};
