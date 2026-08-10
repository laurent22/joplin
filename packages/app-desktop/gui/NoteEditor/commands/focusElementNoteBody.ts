import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { FocusElementOptions } from '../../../commands/focusElement';
import { WindowCommandDependencies } from '../utils/types';

export const declaration: CommandDeclaration = {
	name: 'focusElementNoteBody',
	label: () => _('Note body'),
	parentLabel: () => _('Focus'),
};

export const runtime = (comp: WindowCommandDependencies): CommandRuntime => {
	return {
		execute: async (_context: unknown, options?: FocusElementOptions) => {
			void comp.editorRef.current.execCommand({ name: 'editor.focus', value: options });
		},
		enabledCondition: 'oneNoteSelected',
	};
};
