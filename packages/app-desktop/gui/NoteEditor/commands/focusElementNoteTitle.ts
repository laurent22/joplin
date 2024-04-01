import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { focus } from '@joplin/lib/utils/focusHandler';

export const declaration: CommandDeclaration = {
	name: 'focusElementNoteTitle',
	label: () => _('Note title'),
	parentLabel: () => _('Focus'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async () => {
			if (!comp.titleInputRef.current) return;
			focus('focusElementNoteTitle', comp.titleInputRef.current);
		},
		enabledCondition: 'oneNoteSelected',
	};
};
