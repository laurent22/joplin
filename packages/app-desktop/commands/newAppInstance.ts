import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import bridge from '../services/bridge';
import { execCommand } from '@joplin/utils';
import Setting from '@joplin/lib/models/Setting';
import { homedir } from 'os';

export const declaration: CommandDeclaration = {
	name: 'newAppInstance',
	label: () => _('New application instance...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			let cmd: string[] = [];

			if (Setting.value('env') === 'dev') {
				// This is convenient to quickly test on dev, but the path needs to be adjusted
				// depending on how things are setup.
				cmd = [
					`${homedir()}/.npm-global/bin/electron`,
					`${homedir()}/src/joplin/packages/app-desktop`,
					'--env', 'dev',
					'--log-level', 'debug',
					'--open-dev-tools',
					'--no-welcome',
				];
			} else {
				const appPath = bridge().electronApp().electronApp().getPath('exe');
				cmd = [
					appPath,
				];
			}

			cmd.push('--alt-instance-id');
			cmd.push('alt1');

			void execCommand(cmd, { detached: true });
		},

		enabledCondition: '!isAltInstance',
	};
};
