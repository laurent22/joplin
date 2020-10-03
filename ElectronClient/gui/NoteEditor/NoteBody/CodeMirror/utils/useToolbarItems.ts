import CommandService, { ToolbarButtonInfo } from 'lib/services/CommandService';
import { PluginStates, utils as pluginUtils } from 'lib/services/plugins/reducer';
import { useMemo } from 'react';

export default function(toolbarType:string, toolbarButtonInfos:ToolbarButtonInfo[], plugins:PluginStates = null) {
	return useMemo(() => {
		const output = toolbarButtonInfos.slice();

		if (plugins) {
			const infos = pluginUtils.viewInfosByType(plugins, 'toolbarButton');

			for (const info of infos) {
				const view = info.view;
				if (view.location !== toolbarType) continue;
				output.push(CommandService.instance().commandToToolbarButton(view.commandName));
			}
		}

		return output;
	}, [toolbarButtonInfos, plugins]);
}
