import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { FocusElementOptions } from '../../../commands/focusElement';
import { WindowCommandDependencies } from '../utils/types';

export const declaration: CommandDeclaration = {
	name: 'focusElementNoteViewer',
	label: () => _('Note viewer'),
	parentLabel: () => _('Focus'),
};

export const runtime = (dependencies: WindowCommandDependencies): CommandRuntime => {
	return {
		execute: async (_context: unknown, options?: FocusElementOptions) => {
			await dependencies.editorRef.current.execCommand({
				name: 'viewer.focus',
				value: options,
			});
		},
		enabledCondition: 'markdownEditorVisible',
	};
};
