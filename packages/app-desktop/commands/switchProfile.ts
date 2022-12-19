import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { saveProfileConfig } from '@joplin/lib/services/profileConfig';
import { ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import restart from '../services/restart';

export const declaration: CommandDeclaration = {
	name: 'switchProfile',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, profileId: string) => {
			const currentConfig = context.state.profileConfig;
			if (currentConfig.currentProfileId === profileId) return;

			const newConfig: ProfileConfig = {
				...currentConfig,
				currentProfileId: profileId,
			};

			await saveProfileConfig(`${Setting.value('rootProfileDir')}/profiles.json`, newConfig);
			await restart(false);
		},
	};
};
