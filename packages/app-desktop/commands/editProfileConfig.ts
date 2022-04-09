import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import Setting from '../../lib/models/Setting';
import { openFileWithExternalEditor } from '../../lib/services/ExternalEditWatcher/utils';
import bridge from '../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'editProfileConfig',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			await openFileWithExternalEditor(`${Setting.value('rootProfileDir')}/profiles.json`, bridge());
		},
	};
};
