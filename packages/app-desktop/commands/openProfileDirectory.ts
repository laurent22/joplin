import { CommandRuntime, CommandDeclaration } from '@joplinapp/lib/services/CommandService';
import { _ } from '@joplinapp/lib/locale';
import bridge from '../services/bridge';
import Setting from '@joplinapp/lib/models/Setting';

export const declaration:CommandDeclaration = {
	name: 'openProfileDirectory',
	label: () => _('Open profile directory'),
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async () => {
			bridge().openItem(Setting.value('profileDir'));
		},
	};
};
