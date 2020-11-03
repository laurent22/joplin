import { CommandRuntime, CommandDeclaration } from '../lib/services/CommandService';
import { _ } from 'lib/locale';
import bridge from '../services/bridge';
import Setting from 'lib/models/Setting';

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
