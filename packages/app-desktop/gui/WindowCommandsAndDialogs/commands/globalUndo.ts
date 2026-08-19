import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { WindowControl } from '../utils/useWindowControl';
import bridge from '../../../services/bridge';
import canUseNativeUndo from './utils/canUseNativeUndo';

export const declaration: CommandDeclaration = {
	name: 'globalUndo',
	label: () => _('Undo'),
};

export const runtime = (control: WindowControl): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			// As of January 2026, webContents.undo() doesn't work properly in more complex
			// edit controls (e.g. CodeMirror or TinyMCE). Only use it when a more simple input
			// has focus:
			if (canUseNativeUndo(control)) {
				bridge().activeWindow().webContents.undo();
			} else {
				await CommandService.instance().execute('editor.undo');
			}
		},

		enabledCondition: '',
	};
};
