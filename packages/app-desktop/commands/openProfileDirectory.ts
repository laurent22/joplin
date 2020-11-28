import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import bridge from '../services/bridge';
import Setting from '@joplin/lib/models/Setting';

export const declaration: CommandDeclaration = {
	name: 'openProfileDirectory',
	label: () => _('Open profile directory'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			void bridge().openItem(Setting.value('profileDir'));
		},
	};
};
