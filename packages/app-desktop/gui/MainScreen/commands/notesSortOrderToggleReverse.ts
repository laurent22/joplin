import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { NOTES_SORT_ORDER_SWITCH, SETTING_REVERSE } from './notesSortOrderSwitch';

export const NOTES_SORT_ORDER_TOGGLE_REVERSE = 'notesSortOrderToggleReverse';

export const declaration: CommandDeclaration = {
	name: NOTES_SORT_ORDER_TOGGLE_REVERSE,
	label: () => Setting.settingMetadata(SETTING_REVERSE).label(),
	parentLabel: () => _('Notes'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			const reverse = Setting.value(SETTING_REVERSE)
			return CommandService.instance().execute(NOTES_SORT_ORDER_SWITCH, undefined, !reverse);
		},
	};
};
