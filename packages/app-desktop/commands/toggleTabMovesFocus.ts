import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { DesktopCommandContext } from '../services/commands/types';
import Setting from '@joplin/lib/models/Setting';

export const declaration: CommandDeclaration = {
	name: 'toggleTabMovesFocus',
	label: () => _('Toggle editor tab key navigation'),
	iconName: 'fas fa-keyboard',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: DesktopCommandContext, enabled: boolean = null) => {
			const newValue = enabled ?? !Setting.value('editor.tabMovesFocus');
			Setting.setValue('editor.tabMovesFocus', newValue);
		},
		enabledCondition: 'oneNoteSelected',
	};
};
