import { CommandRuntime, CommandDeclaration } from 'lib/services/CommandService';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'focusElementNoteBody',
	label: () => _('Note body'),
	parentLabel: () => _('Focus'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			comp.editorRef.current.execCommand({ name: 'focus' });
		},
		enabledCondition: 'oneNoteSelected',
	};
};
