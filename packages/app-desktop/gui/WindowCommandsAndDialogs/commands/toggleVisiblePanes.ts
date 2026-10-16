import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'toggleVisiblePanes',
	label: () => _('Toggle editor layout'),
	iconName: 'icon-layout ',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			context.dispatch({
				type: 'NOTE_VISIBLE_PANES_TOGGLE',
			});
		},

		// Showing the merged text would hide which side each conflict came from.
		enabledCondition: 'markdownEditorVisible && oneNoteSelected && !activeNoteIsConflict',
	};
};
