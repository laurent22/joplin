import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { createNewProfile, saveProfileConfig } from '@joplin/lib/services/profileConfig';
import Setting from '@joplin/lib/models/Setting';
import restart from '../../../services/restart';
import { WindowControl } from '../utils/useWindowControl';

export const declaration: CommandDeclaration = {
	name: 'addProfile',
	label: () => _('Create new profile...'),
};

export const runtime = (comp: WindowControl): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			comp.setState({
				promptOptions: {
					label: _('Profile name:'),
					buttons: ['create', 'cancel'],
					value: '',
					onClose: async (answer: unknown) => {
						if (answer) {
							const { newConfig, newProfile } = createNewProfile(context.state.profileConfig, answer as string);
							newConfig.currentProfileId = newProfile.id;
							await saveProfileConfig(`${Setting.value('rootProfileDir')}/profiles.json`, newConfig);
							await restart();
						}

						comp.setState({ promptOptions: null });
					},
				},
			});
		},
	};
};
