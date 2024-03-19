import { useMemo } from 'react';
import { ButtonSpec } from '../types';
import { ButtonRowProps } from '../types';
import { PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import CommandService from '@joplin/lib/services/CommandService';

interface PluginButtonsRowProps extends ButtonRowProps {
	pluginStates: PluginStates;
}

const usePluginButtons = (props: PluginButtonsRowProps) => {
	return useMemo(() => {
		const pluginButtons: ButtonSpec[] = [];

		const pluginCommands =
			pluginUtils
				.commandNamesFromViews(props.pluginStates, 'editorToolbar')
				// Remove separators
				.filter(name => name !== '-');

		const commandService = CommandService.instance();
		for (const commandName of pluginCommands) {
			const command = commandService.commandByName(commandName, { runtimeMustBeRegistered: true });

			pluginButtons.push({
				description: commandService.description(commandName),
				icon: command.declaration.iconName ?? 'fas fa-cog',
				onPress: async () => {
					void commandService.execute(commandName);
				},
			});
		}

		return pluginButtons;
	}, [props.pluginStates]);
};

export default usePluginButtons;
