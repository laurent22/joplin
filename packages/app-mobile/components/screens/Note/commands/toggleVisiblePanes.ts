import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { CommandRuntimeProps } from '../types';

export const declaration: CommandDeclaration = {
	// For compatibility with the desktop app, this command is called "toggleVisiblePanes".
	name: 'toggleVisiblePanes',
	label: () => 'Start/stop editing',
};

export const runtime = (props: CommandRuntimeProps): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			// For now, the only two "panes" on mobile are view and edit.
			const newMode = props.getMode() === 'edit' ? 'view' : 'edit';
			props.setMode(newMode);
		},
	};
};
