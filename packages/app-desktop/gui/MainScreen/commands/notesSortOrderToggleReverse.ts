import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'notesSortOrderToggleReverse',
	label: () => Setting.settingMetadata('notes.sortOrder.reverse').label(),
	parentLabel: () => _('Notes'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			const reverse = Setting.value('notes.sortOrder.reverse');
			return CommandService.instance().execute('notesSortOrderSwitch', undefined, !reverse);
		},
	};
};
