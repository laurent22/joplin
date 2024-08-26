import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'focusElementNoteBody',
	label: () => _('Note body'),
	parentLabel: () => _('Focus'),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (_context: unknown, cursorLocation?: number) => {
			comp.editorRef.current.execCommand({ name: 'editor.focus', value: cursorLocation });
		},
		enabledCondition: 'oneNoteSelected',
	};
};
