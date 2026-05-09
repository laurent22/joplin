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
		// Note: we don't gate on `noteIsWhiteboard` here because that requires
		// the note's body to be present in the redux state, which it isn't —
		// only preview fields are. Gating on selection + setting is enough; the
		// flag the command flips is per-note and only takes effect when the
		// active note actually contains a jsoncanvas fence.
		enabledCondition: 'oneNoteSelected && whiteboardEnabled',
	};
};
