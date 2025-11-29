import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { openFileWithExternalEditor } from '@joplin/lib/services/ExternalEditWatcher/utils';
import bridge from '../services/bridge';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'editProfileConfig',
	label: () => _('Edit profile configuration...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			await openFileWithExternalEditor(`${Setting.value('rootProfileDir')}/profiles.json`, bridge());
		},
		enabledCondition: 'hasMultiProfiles',
	};
};
