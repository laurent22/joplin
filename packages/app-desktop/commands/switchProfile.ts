import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { saveProfileConfig } from '@joplin/lib/services/profileConfig';
import { ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import bridge from '../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'switchProfile',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, profileIndex: number) => {
			const currentConfig = context.state.profileConfig;
			if (currentConfig.currentProfile === profileIndex) return;

			const newConfig: ProfileConfig = {
				...currentConfig,
				currentProfile: profileIndex,
			};

			await saveProfileConfig(`${Setting.value('rootProfileDir')}/profiles.json`, newConfig);
			bridge().restart();
		},
	};
};
