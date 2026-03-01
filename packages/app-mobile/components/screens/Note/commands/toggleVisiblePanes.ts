import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { CommandRuntimeProps } from '../types';
import Setting from '@joplin/lib/models/Setting';

export const declaration: CommandDeclaration = {
	// For compatibility with the desktop app, this command is called "toggleVisiblePanes".
	name: 'toggleVisiblePanes',
	label: () => 'Start/stop editing',
};

export const runtime = (props: CommandRuntimeProps): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			const panes = Setting.value('noteVisiblePanes') || ['viewer'];
			props.dispatch({
				type: 'NOTE_VISIBLE_PANES_SET',
				panes: panes.includes('editor') ? ['viewer'] : ['editor'],
			});
			const currentMode = props.getMode();
			const newMode = currentMode === 'edit' ? 'view' : 'edit';
			props.setMode(newMode);
		},
	};
};
