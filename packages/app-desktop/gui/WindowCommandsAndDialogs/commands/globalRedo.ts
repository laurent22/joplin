import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { WindowControl } from '../utils/useWindowControl';
import bridge from '../../../services/bridge';
import canUseNativeUndo from './utils/canUseNativeUndo';

export const declaration: CommandDeclaration = {
	name: 'globalRedo',
	label: () => _('Redo'),
};

export const runtime = (control: WindowControl): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			if (canUseNativeUndo(control)) {
				bridge().activeWindow().webContents.redo();
			} else {
				await CommandService.instance().execute('editor.redo');
			}
		},

		enabledCondition: '',
	};
};
