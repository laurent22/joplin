import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'toggleWhiteboardEditor',
	label: () => _('Toggle whiteboard / Markdown view'),
	iconName: 'fas fa-eye',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId?: string) => {
			const id = noteId || context.state.selectedNoteIds?.[0];
			if (!id) return;
			context.dispatch({ type: 'WHITEBOARD_FORCE_MARKDOWN_TOGGLE', noteId: id });
		},
		enabledCondition: 'oneNoteSelected',
	};
};
