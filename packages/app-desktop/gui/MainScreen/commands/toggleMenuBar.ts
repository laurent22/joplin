import { CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import bridge from '../../../services/bridge';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'toggleMenuBar',
	label: () => _('Toggle menu bar'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			// Defensive code: macOS disallows hiding the menu bar, so ignore this Command
			if (shim.isMac()) return;

			const electronWindow = bridge().window();
			Setting.toggle('hideMenuBar');

			// Now apply the setting
			electronWindow.setAutoHideMenuBar(Setting.value('hideMenuBar'));
			electronWindow.setMenuBarVisibility(!Setting.value('hideMenuBar'));
		},
	};
};
