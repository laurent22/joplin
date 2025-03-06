import { CommandDeclaration, CommandRuntime, CommandContext } from '@joplin/lib/services/CommandService';
import { stateUtils } from '@joplin/lib/reducer';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';

export const declaration: CommandDeclaration = {
	name: 'toggleEditors',
	label: () => _('Toggle editors'),
	iconName: 'fa-columns',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			// A bit of a hack, but for now don't allow changing code view
			// while a note is being saved as it will cause a problem with
			// TinyMCE because it won't have time to send its content before
			// being switch to Ace Editor.
			if (stateUtils.hasNotesBeingSaved(context.state)) return;

			const newValue = !Setting.value('editor.codeView');
			Setting.setValue('editor.codeView', newValue);
			context.dispatch({ type: 'EDITOR_CODE_VIEW_CHANGE', value: newValue });
		},
		enabledCondition: '!notesAreBeingSaved && oneNoteSelected',
	};
};
