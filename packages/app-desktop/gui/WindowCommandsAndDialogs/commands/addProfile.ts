import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { createNewProfile, saveProfileConfig } from '@joplin/lib/services/profileConfig';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import restart from '../../../services/restart';

const logger = Logger.create('commands/addProfile');

export const declaration: CommandDeclaration = {
	name: 'addProfile',
	label: () => _('Create new profile...'),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			comp.setState({
				promptOptions: {
					label: _('Profile name:'),
					buttons: ['create', 'cancel'],
					value: '',
					onClose: async (answer: string) => {
						if (answer) {
							const { newConfig, newProfile } = createNewProfile(context.state.profileConfig, answer);
							newConfig.currentProfileId = newProfile.id;

							// Inherit the plugin enabled/disabled state from the source profile.
							// The plugin binaries live in a shared `${rootProfileDir}/plugins`
							// directory, so without seeding `plugins.states` the new profile would
							// default every installed plugin to enabled.
							try {
								const pluginStates = Setting.value('plugins.states');
								const newProfileDir = `${Setting.value('rootProfileDir')}/profile-${newProfile.id}`;
								await shim.fsDriver().mkdir(newProfileDir);
								await shim.fsDriver().writeFile(
									`${newProfileDir}/settings.json`,
									JSON.stringify({ 'plugins.states': pluginStates }, null, '\t'),
									'utf8',
								);
							} catch (error) {
								logger.error('Could not seed plugin states for new profile:', error);
							}

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
