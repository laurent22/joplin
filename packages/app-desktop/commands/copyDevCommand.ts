import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
const app = require('@electron/remote').app;
const { clipboard } = require('electron');

export const declaration: CommandDeclaration = {
	name: 'copyDevCommand',
	label: () => _('Copy dev mode command to clipboard'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			const appPath = app.getPath('exe');
			const cmd = `${appPath} --env dev`;
			clipboard.writeText(cmd);
			alert(`The dev mode command has been copied to clipboard:\n\n${cmd}`);
		},
	};
};
